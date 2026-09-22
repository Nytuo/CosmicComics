import AppKit
import QuickLookUI
import UniformTypeIdentifiers

/// Space bar preview in Finder: the cover, full size.
@objc(PreviewProvider)
final class PreviewProvider: QLPreviewProvider, QLPreviewingController {
    func providePreview(for request: QLFilePreviewRequest) async throws -> QLPreviewReply {
        let data = try ComicArchive.cover(of: request.fileURL)
        guard let image = NSImage(data: data), let rep = image.representations.first else {
            throw ComicArchive.Failure.noImage
        }
        let size = CGSize(width: rep.pixelsWide, height: rep.pixelsHigh)
        if data.starts(with: [0xFF, 0xD8]) {
            return QLPreviewReply(dataOfContentType: .jpeg, contentSize: size) { _ in data }
        }
        if data.starts(with: [0x89, 0x50, 0x4E, 0x47]) {
            return QLPreviewReply(dataOfContentType: .png, contentSize: size) { _ in data }
        }
        guard let tiff = image.tiffRepresentation,
            let png = NSBitmapImageRep(data: tiff)?.representation(using: .png, properties: [:])
        else { throw ComicArchive.Failure.noImage }
        return QLPreviewReply(dataOfContentType: .png, contentSize: size) { _ in png }
    }
}
