import Compression
import Foundation

/// Reads the cover (first page, in natural name order) of a comic archive.
/// Only formats macOS can read without extra libraries: ZIP (.cbz) and TAR
/// (.cbt). RAR and 7z archives keep the generic icon.
enum ComicArchive {
    enum Failure: Error {
        case unsupported
        case noImage
        case corrupt
    }

    static let imageExtensions: Set<String> = [
        "jpg", "jpeg", "png", "gif", "webp", "bmp", "avif", "heic", "tif", "tiff",
    ]

    static func cover(of url: URL) throws -> Data {
        let data = try Data(contentsOf: url, options: .alwaysMapped)
        if data.starts(with: [0x50, 0x4B]) {
            return try Zip(data: data).firstImage()
        }
        if data.count > 262, data[257..<262].elementsEqual("ustar".utf8) {
            return try Tar(data: data).firstImage()
        }
        throw Failure.unsupported
    }

    static func isPage(_ name: String) -> Bool {
        let file = (name as NSString).lastPathComponent
        return !file.hasPrefix(".") && !name.contains("__MACOSX")
            && imageExtensions.contains((file as NSString).pathExtension.lowercased())
    }

    static func first<T>(_ entries: [(name: String, entry: T)]) throws -> T {
        guard
            let found = entries.filter({ isPage($0.name) }).min(by: {
                $0.name.localizedStandardCompare($1.name) == .orderedAscending
            })
        else { throw Failure.noImage }
        return found.entry
    }
}

extension Data {
    func uint16(_ at: Int) -> Int {
        Int(self[startIndex + at]) | Int(self[startIndex + at + 1]) << 8
    }

    func uint32(_ at: Int) -> Int {
        uint16(at) | uint16(at + 2) << 16
    }

    func uint64(_ at: Int) -> Int {
        uint32(at) | uint32(at + 4) << 32
    }
}

struct Zip {
    struct Entry {
        let method: Int
        let compressedSize: Int
        let size: Int
        let localOffset: Int
    }

    let data: Data

    func firstImage() throws -> Data {
        try read(ComicArchive.first(try entries()))
    }

    private func entries() throws -> [(name: String, entry: Entry)] {
        let tail = Swift.max(0, data.count - 65_557)
        guard
            let end = stride(from: data.count - 22, through: tail, by: -1).first(where: {
                data.uint32($0) == 0x0605_4B50
            })
        else { throw ComicArchive.Failure.corrupt }
        var count = data.uint16(end + 10)
        var directory = data.uint32(end + 16)
        if directory == 0xFFFF_FFFF || count == 0xFFFF, end >= 20, data.uint32(end - 20) == 0x0706_4B50 {
            let zip64 = data.uint64(end - 12)
            guard zip64 + 56 <= data.count, data.uint32(zip64) == 0x0606_4B50 else {
                throw ComicArchive.Failure.corrupt
            }
            count = data.uint64(zip64 + 32)
            directory = data.uint64(zip64 + 48)
        }

        var out: [(name: String, entry: Entry)] = []
        var at = directory
        for _ in 0..<count {
            guard at + 46 <= data.count, data.uint32(at) == 0x0201_4B50 else { break }
            let nameLength = data.uint16(at + 28)
            let extraLength = data.uint16(at + 30)
            let commentLength = data.uint16(at + 32)
            var compressed = data.uint32(at + 20)
            var size = data.uint32(at + 24)
            var offset = data.uint32(at + 42)
            let name = String(decoding: data[(data.startIndex + at + 46)..<(data.startIndex + at + 46 + nameLength)], as: UTF8.self)

            // ZIP64: sizes and offset that did not fit are in extra field 1.
            var extra = at + 46 + nameLength
            let extraEnd = extra + extraLength
            while extra + 4 <= extraEnd {
                let id = data.uint16(extra)
                let length = data.uint16(extra + 2)
                if id == 1 {
                    var field = extra + 4
                    if size == 0xFFFF_FFFF { size = data.uint64(field); field += 8 }
                    if compressed == 0xFFFF_FFFF { compressed = data.uint64(field); field += 8 }
                    if offset == 0xFFFF_FFFF { offset = data.uint64(field) }
                }
                extra += 4 + length
            }
            out.append((name, Entry(method: data.uint16(at + 10), compressedSize: compressed, size: size, localOffset: offset)))
            at = extraEnd + commentLength
        }
        return out
    }

    private func read(_ entry: Entry) throws -> Data {
        let local = entry.localOffset
        guard local + 30 <= data.count, data.uint32(local) == 0x0403_4B50 else {
            throw ComicArchive.Failure.corrupt
        }
        let start = local + 30 + data.uint16(local + 26) + data.uint16(local + 28)
        guard start + entry.compressedSize <= data.count else { throw ComicArchive.Failure.corrupt }
        let stored = data[(data.startIndex + start)..<(data.startIndex + start + entry.compressedSize)]
        switch entry.method {
        case 0:
            return Data(stored)
        case 8:
            var out = Data(count: entry.size)
            let written = out.withUnsafeMutableBytes { target in
                stored.withUnsafeBytes { source in
                    compression_decode_buffer(
                        target.bindMemory(to: UInt8.self).baseAddress!, entry.size,
                        source.bindMemory(to: UInt8.self).baseAddress!, entry.compressedSize,
                        nil, COMPRESSION_ZLIB)
                }
            }
            guard written == entry.size else { throw ComicArchive.Failure.corrupt }
            return out
        default:
            throw ComicArchive.Failure.unsupported
        }
    }
}

struct Tar {
    let data: Data

    func firstImage() throws -> Data {
        var entries: [(name: String, entry: Range<Int>)] = []
        var at = 0
        while at + 512 <= data.count {
            let header = data[(data.startIndex + at)..<(data.startIndex + at + 512)]
            if header.allSatisfy({ $0 == 0 }) { break }
            let field = { (from: Int, length: Int) -> String in
                let bytes = header[(header.startIndex + from)..<(header.startIndex + from + length)]
                return String(decoding: bytes.prefix(while: { $0 != 0 }), as: UTF8.self)
            }
            let size = Int(field(124, 12).trimmingCharacters(in: .whitespaces), radix: 8) ?? 0
            let prefix = field(345, 155)
            let name = prefix.isEmpty ? field(0, 100) : "\(prefix)/\(field(0, 100))"
            let type = header[header.startIndex + 156]
            if type == 0 || type == UInt8(ascii: "0") {
                entries.append((name, (at + 512)..<(at + 512 + size)))
            }
            at += 512 + (size + 511) / 512 * 512
        }
        let range = try ComicArchive.first(entries)
        guard range.upperBound <= data.count else { throw ComicArchive.Failure.corrupt }
        return Data(data[(data.startIndex + range.lowerBound)..<(data.startIndex + range.upperBound)])
    }
}
