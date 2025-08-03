/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveLength(length: number): R
      toBeTruthy(): R
      toBe(value: any): R
      toEqual(value: any): R
      toContain(item: any): R
      toMatch(regexp: RegExp): R
      toHaveBeenCalled(): R
      toHaveBeenCalledWith(...args: any[]): R
      not: Matchers<R>
    }
  }
}
