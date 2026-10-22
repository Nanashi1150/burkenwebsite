import { expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RiderDashboard } from '@/components/RiderDashboard'
import type { OrderView } from '@/lib/order-view'

const actions = vi.hoisted(() => ({ updateOrderAction: vi.fn(), uploadDeliveryPhotoAction: vi.fn() }))
vi.mock('@/app/(frontend)/actions', () => actions)
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/components/DeliveryMap', () => ({ DeliveryMap: () => <div /> }))
vi.mock('@/components/AutoScrollItems', () => ({ AutoScrollItems: () => <div /> }))

it('shows total earnings and requires an image before submitting delivery confirmation', async () => {
  actions.uploadDeliveryPhotoAction.mockResolvedValue({ ok: true, photoID: 'proof-1' })
  actions.updateOrderAction.mockResolvedValue({ ok: true })
  const order: OrderView = { id: 'order-1', orderNumber: 'BK001', createdAt: '2026-10-23T00:00:00Z', status: 'delivering', fulfillment: 'delivery', address: null, deliveryLocation: { latitude: 13, longitude: 100 }, customerName: 'Customer', riderId: 'rider-1', riderName: 'Rider', total: 138, deliveryFee: 39, items: [] }
  render(<RiderDashboard orders={[order]} riderID="rider-1" earnedTotal={117} />)
  const user = userEvent.setup()
  expect(screen.getByText('฿117')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'งานของฉัน · 1' }))
  const confirm = screen.getByRole('button', { name: 'ยืนยันส่งถึงลูกค้าแล้ว' }) as HTMLButtonElement
  expect(confirm.disabled).toBe(true)
  const input = screen.getByLabelText('รูปยืนยันการจัดส่ง') as HTMLInputElement
  expect(input.getAttribute('capture')).toBe('environment')
  await user.upload(input, new File(['image contents'], 'delivery.jpg', { type: 'image/jpeg' }))
  expect(confirm.disabled).toBe(false)
  await user.click(confirm)
  await waitFor(() => expect(actions.updateOrderAction).toHaveBeenCalledWith('order-1', 'deliver', 'proof-1'))
  const form = actions.uploadDeliveryPhotoAction.mock.calls[0][0] as FormData
  expect(form.get('orderID')).toBe('order-1')
  expect((form.get('photo') as File).name).toBe('delivery.jpg')
})
