import { describe, it, expect } from '@jest/globals'

import { hello } from '../'

describe('hello', () => {
  it('should return hello', () => {
    expect(hello()).toEqual('hello')
  })
})
