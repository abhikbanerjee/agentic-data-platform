import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager

    @State private var email: String = ""
    @State private var password: String = ""
    @State private var displayName: String = ""
    @State private var showPassword: Bool = false
    @State private var isLoading: Bool = false
    @State private var isRegistering: Bool = false

    let navy = Color(red: 26/255, green: 58/255, blue: 92/255)
    let blue = Color(red: 13/255, green: 95/255, blue: 170/255)
    let teal = Color(red: 14/255, green: 116/255, blue: 144/255)

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // MARK: - Brand Header
                VStack(spacing: 12) {
                    Text("AgenticDT")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.white)

                    Text("AI-Native Agentic Data Platform")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))

                    HStack(spacing: 12) {
                        featureChip("Secure")
                        featureChip("Intelligent")
                        featureChip("Always-On")
                    }
                    .padding(.top, 8)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
                .background(
                    LinearGradient(
                        gradient: Gradient(colors: [navy, navy.opacity(0.8)]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

                Spacer()

                // MARK: - Form Card
                VStack(spacing: 20) {
                    // Title
                    Text(isRegistering ? "Create Account" : "Welcome Back")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(navy)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    // Google Sign-In Button
                    Button(action: {
                        isLoading = true
                        Task {
                            await authManager.signInWithGoogle()
                            isLoading = false
                        }
                    }) {
                        HStack(spacing: 12) {
                            HStack(spacing: 0) {
                                Text("G").foregroundColor(Color(red: 0.855, green: 0.157, blue: 0.157))
                                    + Text("o").foregroundColor(Color(red: 0.996, green: 0.498, blue: 0.0))
                                    + Text("o").foregroundColor(Color(red: 0.961, green: 0.792, blue: 0.0))
                                    + Text("g").foregroundColor(Color(red: 0.0, green: 0.604, blue: 0.980))
                                    + Text("l").foregroundColor(Color(red: 0.25, green: 0.627, blue: 0.278))
                                    + Text("e").foregroundColor(Color(red: 0.855, green: 0.157, blue: 0.157))
                            }
                            .font(.system(size: 16, weight: .semibold))

                            Text("Sign in with Google")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.black)

                            Spacer()
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .padding(.horizontal, 16)
                        .background(Color.white)
                        .cornerRadius(10)
                        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                    }
                    .disabled(isLoading)

                    // Divider with "or"
                    HStack(spacing: 12) {
                        Rectangle()
                            .foregroundColor(Color.gray.opacity(0.3))
                            .frame(height: 1)

                        Text("or")
                            .font(.system(size: 13, weight: .regular))
                            .foregroundColor(Color.gray.opacity(0.6))

                        Rectangle()
                            .foregroundColor(Color.gray.opacity(0.3))
                            .frame(height: 1)
                    }

                    // Email Field
                    HStack(spacing: 12) {
                        Image(systemName: "envelope.fill")
                            .foregroundColor(blue)
                            .font(.system(size: 16, weight: .semibold))

                        TextField("Email address", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .font(.system(size: 16, weight: .regular))
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color.gray.opacity(0.05))
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.gray.opacity(0.2), lineWidth: 1))

                    // Password Field
                    HStack(spacing: 12) {
                        Image(systemName: "lock.fill")
                            .foregroundColor(blue)
                            .font(.system(size: 16, weight: .semibold))

                        if showPassword {
                            TextField("Password", text: $password)
                                .font(.system(size: 16, weight: .regular))
                        } else {
                            SecureField("Password", text: $password)
                                .font(.system(size: 16, weight: .regular))
                        }

                        Button(action: { showPassword.toggle() }) {
                            Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                .foregroundColor(Color.gray.opacity(0.6))
                                .font(.system(size: 14, weight: .semibold))
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color.gray.opacity(0.05))
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.gray.opacity(0.2), lineWidth: 1))

                    // Display Name Field (Register mode only)
                    if isRegistering {
                        HStack(spacing: 12) {
                            Image(systemName: "person.fill")
                                .foregroundColor(blue)
                                .font(.system(size: 16, weight: .semibold))

                            TextField("Full name", text: $displayName)
                                .font(.system(size: 16, weight: .regular))
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(Color.gray.opacity(0.05))
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.gray.opacity(0.2), lineWidth: 1))
                    }

                    // Primary Action Button
                    Button(action: {
                        isLoading = true
                        Task {
                            if isRegistering {
                                await authManager.register(email: email, password: password, displayName: displayName)
                            } else {
                                await authManager.signIn(email: email, password: password)
                            }
                            isLoading = false
                        }
                    }) {
                        if isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text(isRegistering ? "Create Account" : "Sign In")
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .foregroundColor(.white)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [blue, teal]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(10)
                    .disabled(isLoading || email.isEmpty || password.isEmpty || (isRegistering && displayName.isEmpty))
                    .opacity(isLoading || email.isEmpty || password.isEmpty || (isRegistering && displayName.isEmpty) ? 0.6 : 1.0)

                    // Error Message
                    if let error = authManager.errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(Color(red: 0.855, green: 0.157, blue: 0.157))

                            Text(error)
                                .font(.system(size: 13, weight: .regular))
                                .foregroundColor(Color(red: 0.855, green: 0.157, blue: 0.157))
                                .lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Toggle Link
                    HStack(spacing: 4) {
                        Text(isRegistering ? "Already have an account?" : "Don't have an account?")
                            .font(.system(size: 14, weight: .regular))
                            .foregroundColor(Color.gray.opacity(0.7))

                        Button(action: {
                            isRegistering.toggle()
                            authManager.errorMessage = nil
                            email = ""
                            password = ""
                            displayName = ""
                        }) {
                            Text(isRegistering ? "Sign in" : "Create one")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(blue)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                }
                .padding(28)
                .background(Color.white)
                .cornerRadius(24, corners: [.topLeft, .topRight])
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .preferredColorScheme(.light)
    }

    private func featureChip(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(.white.opacity(0.8))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.15))
            .cornerRadius(6)
    }
}

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager())
}
