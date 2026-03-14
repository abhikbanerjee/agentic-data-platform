import SwiftUI
import FirebaseCore

@main
struct AgenticDTApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var platformVM = PlatformViewModel()

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            if authManager.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(red: 26/255, green: 58/255, blue: 92/255))
            } else if authManager.isAuthenticated {
                ContentView()
                    .environmentObject(platformVM)
                    .environmentObject(authManager)
                    .preferredColorScheme(.light)
            } else {
                LoginView()
                    .environmentObject(authManager)
                    .preferredColorScheme(.light)
            }
        }
    }
}
