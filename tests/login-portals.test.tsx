import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mocks = vi.hoisted(() => ({ login: vi.fn(), setCookie: vi.fn(), redirect: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/payload", () => ({ getPayloadClient: async () => ({ login: mocks.login }) }))
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.setCookie }) }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("payload", () => ({ createPayloadRequest: vi.fn(), logoutOperation: vi.fn() }))

import { loginAction, riderLoginAction } from "@/app/(frontend)/actions"
import { RiderLoginForm } from "@/components/RiderLoginForm"

function credentials() {
  const form = new FormData()
  form.set("email", "test@example.invalid")
  form.set("password", "TestPassword123!")
  return form
}

function authenticatedAs(role: "customer" | "staff" | "admin" | "rider") {
  mocks.login.mockResolvedValue({ token: "test-session-token", user: { id: "test-user", collection: "users", role } })
}

beforeEach(() => {
  mocks.login.mockReset()
  mocks.setCookie.mockReset()
  mocks.redirect.mockReset()
})

describe("Login portal role boundaries", () => {
  it.each(["customer", "staff", "admin"] as const)("allows %s on the general login", async role => {
    authenticatedAs(role)
    await loginAction({}, credentials())
    expect(mocks.setCookie).toHaveBeenCalledWith("app-session", "test-session-token", expect.objectContaining({ httpOnly: true }))
    expect(mocks.redirect).toHaveBeenCalledWith("/portal")
  })

  it("rejects a rider on general login even with a forged portal field", async () => {
    authenticatedAs("rider")
    const form = credentials()
    form.set("portal", "rider")
    const result = await loginAction({}, form)
    expect(result).toMatchObject({ loginPath: "/rider/login" })
    expect(mocks.setCookie).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it("allows a rider on rider login", async () => {
    authenticatedAs("rider")
    await riderLoginAction({}, credentials())
    expect(mocks.setCookie).toHaveBeenCalledWith("app-session", "test-session-token", expect.objectContaining({ httpOnly: true }))
    expect(mocks.redirect).toHaveBeenCalledWith("/portal")
  })

  it.each(["customer", "staff", "admin"] as const)("rejects %s on rider login without issuing an app cookie", async role => {
    authenticatedAs(role)
    expect(await riderLoginAction({}, credentials())).toMatchObject({ loginPath: "/login" })
    expect(mocks.setCookie).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it.each([loginAction, riderLoginAction])("keeps invalid credentials generic", async action => {
    mocks.login.mockRejectedValue(new Error("Invalid credentials"))
    expect(await action({}, credentials())).toEqual({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" })
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it("validates input before calling Payload", async () => {
    const form = credentials()
    form.set("email", "invalid")
    expect(await riderLoginAction({}, form)).toHaveProperty("error")
    expect(mocks.login).not.toHaveBeenCalled()
  })
})

it("submits the rider form to the restricted action and links a non-rider to general login", async () => {
  authenticatedAs("customer")
  const user = userEvent.setup()
  render(<RiderLoginForm />)
  expect(screen.queryByRole("button", { name: "สมัครสมาชิก" })).toBeNull()
  await user.type(screen.getByLabelText("อีเมลไรเดอร์"), "test@example.invalid")
  const password = screen.getByLabelText("รหัสผ่าน", { selector: "input" })
  await user.type(password, "TestPassword123!")
  await user.click(screen.getByRole("button", { name: "แสดงรหัสผ่าน" }))
  expect(password.getAttribute("type")).toBe("text")
  await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบเพื่อรับงาน" }))
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("สำหรับบัญชีไรเดอร์เท่านั้น"))
  expect(screen.getByRole("link", { name: "ไปหน้าเข้าสู่ระบบทั่วไป →" }).getAttribute("href")).toBe("/login")
  expect(mocks.setCookie).not.toHaveBeenCalled()
})
