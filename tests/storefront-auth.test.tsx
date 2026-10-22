import type { AnchorHTMLAttributes } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Storefront } from '@/components/Storefront'
import { SiteHeader } from '@/components/SiteHeader'
import { ShoppingSessionProvider } from '@/components/ShoppingSession'
import type { StoreMenuItem } from '@/lib/burken-data'

const actions = vi.hoisted(() => ({ checkoutAction: vi.fn(), logoutAction: vi.fn() }))
vi.mock('@/app/(frontend)/actions', () => actions)
vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/link', () => ({ default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props} /> }))
vi.mock('next/image', () => ({ default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => <img src={src} alt={alt} className={className} /> }))

const category = { id: 'category-1', name: 'Burgers', label: 'BURGERS' }
const item: StoreMenuItem = { id: 'item-1', name: 'Test Burger', description: 'Test menu', price: 99, category, image: { url: '/burger.jpg', alt: 'Test burger', width: 600, height: 400 }, featured: true, available: true, spiceLevel: 'mild' }
const customer = { id: 'customer-a', name: 'Test Customer', role: 'customer' }
let response: { authenticated: boolean; user: typeof customer | null }
let networkFailed = false
const fetchSession = vi.fn(async () => {
  if (networkFailed) throw new Error('Offline')
  return { ok: true, json: async () => response }
})

beforeEach(() => {
  response = { authenticated: false, user: null }
  networkFailed = false
  fetchSession.mockClear()
  actions.checkoutAction.mockReset()
  actions.logoutAction.mockReset()
  vi.stubGlobal('fetch', fetchSession)
})
async function setup() {
  const user = userEvent.setup()
  render(<ShoppingSessionProvider><SiteHeader /><Storefront categories={[category]} items={[item]} /></ShoppingSessionProvider>)
  const add = screen.getByRole('button', { name: 'เพิ่ม Test Burger ลงตะกร้า' }) as HTMLButtonElement
  await waitFor(() => expect(add.disabled).toBe(false))
  return { user, add }
}

afterEach(() => { Reflect.deleteProperty(navigator, 'geolocation') })

describe('verified login before cart changes and checkout', () => {
  it('uses a successful GPS pin without an address and disables the address field', async () => {
    response = { authenticated: true, user: customer }
    actions.checkoutAction.mockResolvedValue({ ok: false, error: 'Keep cart open for verification' })
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 13.7563, longitude: 100.5018, accuracy: 10 } } as GeolocationPosition) } })
    const { user, add } = await setup()
    await user.click(add)
    const cart = await screen.findByRole('dialog', { name: 'ตะกร้าสินค้า' })
    await user.click(within(cart).getByRole('button', { name: 'จัดส่ง +฿39' }))
    expect((within(cart).getByLabelText('ที่อยู่และรายละเอียดจุดส่ง') as HTMLTextAreaElement).disabled).toBe(true)
    await user.click(within(cart).getByRole('button', { name: 'ใช้ตำแหน่งปัจจุบัน' }))
    expect(await within(cart).findByText('เลือกแล้ว')).toBeTruthy()
    await user.click(within(cart).getByRole('button', { name: 'ยืนยันการสั่งอาหาร' }))
    await waitFor(() => expect(actions.checkoutAction).toHaveBeenCalledWith(expect.objectContaining({ fulfillment: 'delivery', address: undefined, deliveryLocation: { latitude: 13.7563, longitude: 100.5018 } })))
    await user.click(within(cart).getByRole('radio', { name: 'กรอกที่อยู่' }))
    const address = within(cart).getByLabelText('ที่อยู่และรายละเอียดจุดส่ง') as HTMLTextAreaElement
    expect(address.disabled).toBe(false)
    await user.type(address, '123 Test Street')
    await user.click(within(cart).getByRole('button', { name: 'ยืนยันการสั่งอาหาร' }))
    await waitFor(() => expect(actions.checkoutAction).toHaveBeenLastCalledWith(expect.objectContaining({ address: '123 Test Street', deliveryLocation: undefined })))
  })
  it('shows a login popup for guests without adding or restoring a forged legacy cart', async () => {
    localStorage.setItem('burken-cart', JSON.stringify({ 'item-1': 15 }))
    const { user, add } = await setup()
    await user.click(add)
    const prompt = await screen.findByRole('alertdialog', { name: 'กรุณาเข้าสู่ระบบก่อน' })
    expect(within(prompt).getByRole('link', { name: 'เข้าสู่ระบบ' }).getAttribute('href')).toBe('/login')
    expect(screen.getByRole('button', { name: 'เปิดตะกร้า มี 0 ชิ้น' })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'ตะกร้าสินค้า' })).toBeNull()
    expect(actions.checkoutAction).not.toHaveBeenCalled()
    expect(localStorage.getItem('burken-cart:customer-a')).toBeNull()
    expect(fetchSession).toHaveBeenCalledWith('/api/app/session', expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }))
    await user.click(within(prompt).getByRole('button', { name: 'เลือกดูเมนูต่อ' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'เปิดตะกร้า มี 0 ชิ้น' })).toBeTruthy()
  })

  it('shows the real signed-in account and adds to that account’s cart', async () => {
    response = { authenticated: true, user: customer }
    const { user, add } = await setup()
    expect(screen.getByText('เข้าสู่ระบบแล้ว')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'ออกจากระบบ' })).toBeTruthy()
    await user.click(add)
    const cart = await screen.findByRole('dialog', { name: 'ตะกร้าสินค้า' })
    expect(within(cart).getByText('Test Burger')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'เปิดตะกร้า มี 1 ชิ้น' })).toBeTruthy()
    await waitFor(() => expect(JSON.parse(localStorage.getItem('burken-cart:customer-a')!)).toEqual({ 'item-1': 1 }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('does not add when the session expires before the add click', async () => {
    response = { authenticated: true, user: customer }
    const { user, add } = await setup()
    response = { authenticated: false, user: null }
    await user.click(add)
    expect(await screen.findByRole('alertdialog', { name: 'กรุณาเข้าสู่ระบบก่อน' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'เปิดตะกร้า มี 0 ชิ้น' })).toBeTruthy()
    expect(actions.checkoutAction).not.toHaveBeenCalled()
  })

  it('rechecks before confirmation and never sends checkout after expiry', async () => {
    response = { authenticated: true, user: customer }
    const { user, add } = await setup()
    await user.click(add)
    const cart = await screen.findByRole('dialog', { name: 'ตะกร้าสินค้า' })
    response = { authenticated: false, user: null }
    await user.click(within(cart).getByRole('button', { name: 'ยืนยันการสั่งอาหาร' }))
    expect(await screen.findByRole('alertdialog', { name: 'กรุณาเข้าสู่ระบบก่อน' })).toBeTruthy()
    expect(actions.checkoutAction).not.toHaveBeenCalled()
  })

  it('handles expiry between client verification and the server checkout guard', async () => {
    response = { authenticated: true, user: customer }
    actions.checkoutAction.mockResolvedValue({ ok: false, code: 'AUTH_REQUIRED', error: 'Login required' })
    const { user, add } = await setup()
    await user.click(add)
    const cart = await screen.findByRole('dialog', { name: 'ตะกร้าสินค้า' })
    await user.click(within(cart).getByRole('button', { name: 'ยืนยันการสั่งอาหาร' }))
    expect(await screen.findByRole('alertdialog', { name: 'กรุณาเข้าสู่ระบบก่อน' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'เปิดตะกร้า มี 0 ชิ้น' })).toBeTruthy()
    expect(actions.checkoutAction).toHaveBeenCalledTimes(1)
  })

  it('fails closed with a visible message when verification is unavailable', async () => {
    networkFailed = true
    const { user, add } = await setup()
    await user.click(add)
    expect(await screen.findByRole('alertdialog', { name: 'ตรวจสอบการเข้าสู่ระบบไม่ได้' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'เปิดตะกร้า มี 0 ชิ้น' })).toBeTruthy()
    expect(actions.checkoutAction).not.toHaveBeenCalled()
  })

  it('does not allow staff/rider accounts to place customer orders', async () => {
    response = { authenticated: true, user: { ...customer, id: 'rider-a', role: 'rider' } }
    const { user, add } = await setup()
    await user.click(add)
    expect(await screen.findByRole('alertdialog', { name: 'กรุณาใช้บัญชีลูกค้า' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'เปิดตะกร้า มี 0 ชิ้น' })).toBeTruthy()
    expect(actions.checkoutAction).not.toHaveBeenCalled()
  })
})
