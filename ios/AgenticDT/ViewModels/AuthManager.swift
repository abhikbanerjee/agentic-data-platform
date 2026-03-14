import Foundation
import FirebaseCore
import FirebaseAuth
import GoogleSignIn
import UIKit

@MainActor
class AuthManager: ObservableObject {
    @Published var user: FirebaseAuth.User? = nil
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = true
    @Published var errorMessage: String? = nil

    private var authStateHandle: AuthStateDidChangeListenerHandle?

    init() {
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor [weak self] in
                self?.user = user
                self?.isAuthenticated = user != nil
                self?.isLoading = false
            }
        }
    }

    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    // MARK: - Email/Password
    func signIn(email: String, password: String) async {
        errorMessage = nil
        do {
            try await Auth.auth().signIn(withEmail: email, password: password)
        } catch {
            errorMessage = friendlyError(error)
        }
    }

    func register(email: String, password: String, displayName: String) async {
        errorMessage = nil
        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            let changeRequest = result.user.createProfileChangeRequest()
            changeRequest.displayName = displayName
            try await changeRequest.commitChanges()
        } catch {
            errorMessage = friendlyError(error)
        }
    }

    // MARK: - Google Sign-In
    func signInWithGoogle() async {
        errorMessage = nil
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            errorMessage = "Firebase configuration error"
            return
        }
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config

        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else {
            errorMessage = "Cannot present sign-in screen"
            return
        }

        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)
            guard let idToken = result.user.idToken?.tokenString else {
                errorMessage = "Google sign-in failed: missing token"
                return
            }
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )
            try await Auth.auth().signIn(with: credential)
        } catch {
            if (error as NSError).code != GIDSignInError.canceled.rawValue {
                errorMessage = friendlyError(error)
            }
        }
    }

    // MARK: - Sign Out
    func signOut() {
        do {
            try Auth.auth().signOut()
            GIDSignIn.sharedInstance.signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Token for backend proxy
    func getIDToken() async -> String? {
        do {
            return try await user?.getIDToken()
        } catch {
            return nil
        }
    }

    // MARK: - User info helpers
    var displayName: String {
        user?.displayName ?? user?.email?.components(separatedBy: "@").first ?? "User"
    }

    var userEmail: String { user?.email ?? "" }

    // MARK: - Friendly errors
    private func friendlyError(_ error: Error) -> String {
        let nsError = error as NSError
        let code = AuthErrorCode(rawValue: nsError.code)
        switch code {
        case .userNotFound:         return "No account found with this email."
        case .wrongPassword:        return "Incorrect password. Please try again."
        case .emailAlreadyInUse:    return "An account already exists with this email."
        case .weakPassword:         return "Password must be at least 6 characters."
        case .invalidEmail:         return "Please enter a valid email address."
        case .networkError:         return "Network error. Please check your connection."
        case .tooManyRequests:      return "Too many attempts. Please try again later."
        default:                    return error.localizedDescription
        }
    }
}
