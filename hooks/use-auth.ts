"use client"

import { useState, useEffect, createContext, useContext } from "react"

interface User {
  id: string
  email: string
  name: string
  role: "buyer" | "seller" | "both"
  avatar?: string
  verified: boolean
  joinedDate: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (userData: any) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkAuth = () => {
      try {
        const storedUser = sessionStorage.getItem("currentUser")
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      // Check if user exists in registration
      const registeredUser = sessionStorage.getItem("registeredUser")

      if (registeredUser) {
        const userData = JSON.parse(registeredUser)
        if (userData.email === email && userData.password === password) {
          const user: User = {
            id: "user_" + Date.now(),
            email: userData.email,
            name: userData.name,
            role: userData.role,
            verified: true,
            joinedDate: new Date().toISOString(),
          }

          setUser(user)
          sessionStorage.setItem("currentUser", JSON.stringify(user))
          setIsLoading(false)
          return { success: true }
        }
      }

      // Demo users for testing
      const demoUsers = [
        {
          email: "buyer@demo.com",
          password: "demo123",
          name: "Demo Buyer",
          role: "buyer" as const,
        },
        {
          email: "seller@demo.com",
          password: "demo123",
          name: "Demo Seller",
          role: "seller" as const,
        },
      ]

      const demoUser = demoUsers.find((u) => u.email === email && u.password === password)

      if (demoUser) {
        const user: User = {
          id: "demo_" + demoUser.role,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          verified: true,
          joinedDate: "2024-01-01T00:00:00Z",
        }

        setUser(user)
        sessionStorage.setItem("currentUser", JSON.stringify(user))
        setIsLoading(false)
        return { success: true }
      }

      setIsLoading(false)
      return { success: false, error: "Invalid email or password" }
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: "Login failed. Please try again." }
    }
  }

  const register = async (userData: any) => {
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    try {
      const user: User = {
        id: "user_" + Date.now(),
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        role: userData.accountType,
        verified: false,
        joinedDate: new Date().toISOString(),
      }

      setUser(user)
      sessionStorage.setItem("currentUser", JSON.stringify(user))
      sessionStorage.setItem(
        "registeredUser",
        JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: user.name,
          role: userData.accountType,
        }),
      )

      setIsLoading(false)
      return { success: true }
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: "Registration failed. Please try again." }
    }
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem("currentUser")
  }

  return {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  }
}

export { AuthContext }
