// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ACMReorderPreview",
    platforms: [.macOS(.v14)],
    dependencies: [.package(path: "../ACMReorder")],
    targets: [
        .executableTarget(name: "ACMReorderPreview", dependencies: [.product(name: "ACMReorder", package: "ACMReorder")])
    ],
    swiftLanguageModes: [.v5]
)
