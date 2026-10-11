// 类名合并：clsx 负责条件，tailwind-merge 负责**后写的赢**。
//
// 少一个也不行：只 clsx 的话，`cn('p-2', 'p-4')` 两个类都在，谁生效看 CSS 里的先后而不是调用顺序，
// 于是「传进来的覆盖默认值」这种最基础的用法会时灵时不灵。tailwind-merge 就是干这个的。
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
