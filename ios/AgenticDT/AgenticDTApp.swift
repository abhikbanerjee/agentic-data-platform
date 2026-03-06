import SwiftUI

@main
struct AgenticDTApp: App {
    @StateObject private var platformVM = PlatformViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(platformVM)
                .preferredColorScheme(.light)
        }
    }
}
