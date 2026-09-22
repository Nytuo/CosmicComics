import AppKit
import QuickLookThumbnailing

/// Finder icons of comic archives: their cover.
@objc(ThumbnailProvider)
final class ThumbnailProvider: QLThumbnailProvider {
    override func provideThumbnail(
        for request: QLFileThumbnailRequest,
        _ handler: @escaping (QLThumbnailReply?, Error?) -> Void
    ) {
        do {
            guard let image = NSImage(data: try ComicArchive.cover(of: request.fileURL)),
                image.size.width > 0, image.size.height > 0
            else { throw ComicArchive.Failure.noImage }
            let scale = min(
                request.maximumSize.width / image.size.width,
                request.maximumSize.height / image.size.height)
            let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            handler(
                QLThumbnailReply(contextSize: size) {
                    image.draw(in: CGRect(origin: .zero, size: size))
                    return true
                }, nil)
        } catch {
            handler(nil, error)
        }
    }
}
