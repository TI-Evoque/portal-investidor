import { ReactNode } from 'react'

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <h1>{title}</h1>
      {action}
    </div>
  )
}
