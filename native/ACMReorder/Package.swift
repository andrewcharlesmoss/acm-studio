// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "ACMReorder", platforms: [.macOS(.v14), .iOS(.v17)], products: [.library(name: "ACMReorder", targets: ["ACMReorder"])], targets: [.target(name: "ACMReorder"), .testTarget(name: "ACMReorderTests", dependencies: ["ACMReorder"])], swiftLanguageModes: [.v5])
