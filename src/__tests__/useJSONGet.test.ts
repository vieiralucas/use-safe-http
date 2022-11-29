import { describe, it, expect } from '@jest/globals'
import { renderHook, act } from '@testing-library/react-hooks/native'
import express from 'express'
import { Server } from 'http'
import * as t from 'io-ts'
import { useState } from 'react'

import { isLoadingState, isSuccessState, useJSONGet } from '../'

const Todo = t.interface({
  id: t.number,
  todo: t.string,
  completed: t.boolean,
})

const todos = [{ id: 1, todo: 'write tests', completed: false }]

describe('useJSONGet', () => {
  let server: Server
  let headers = {}
  let requests = 0
  beforeEach((done) => {
    headers = {}
    requests = 0

    const app = express()
    app.get('/todos', (req, res) => {
      requests += 1
      headers = req.headers
      res.json(todos)
    })
    server = app.listen(3000, done)
  })

  afterEach((done) => {
    server.close(done)
  })

  it('should make the request and decode result', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useJSONGet('http://localhost:3000/todos', t.array(Todo))
    )

    expect(isLoadingState(result.current[0])).toBe(true)
    await waitForNextUpdate()
    expect(isSuccessState(result.current[0])).toBe(true)
    expect(result.current[0]).toHaveProperty('json', todos)
  })

  it('should pass headers', async () => {
    const { waitForNextUpdate } = renderHook(() =>
      useJSONGet('http://localhost:3000/todos', t.array(Todo), {
        'x-custom-header': 'custom value',
      })
    )
    await waitForNextUpdate()
    expect(headers).toHaveProperty('x-custom-header', 'custom value')
  })

  it('should make the request again when url changes', async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const [url, setUrl] = useState('http://localhost:3000/todos?a=1')
      useJSONGet(url, t.array(Todo))

      return setUrl
    })
    await waitForNextUpdate()
    expect(requests).toBe(1)
    act(() => {
      result.current('http://localhost:3000/todos?a=2')
    })
    await waitForNextUpdate()
    expect(requests).toBe(2)
  })

  it('should make the request again when url changes, even when still loading', async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const [url, setUrl] = useState('http://localhost:3000/todos?a=1')
      useJSONGet(url, t.array(Todo))

      return setUrl
    })
    // assert that we did not even get the first request
    expect(requests).toBe(0)
    act(() => {
      result.current('http://localhost:3000/todos?a=2')
    })
    await waitForNextUpdate()
    expect(requests).toBe(2)
  })

  describe('refetch', () => {
    it('should make the request again', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useJSONGet('http://localhost:3000/todos', t.array(Todo))
      )
      await waitForNextUpdate()
      act(() => {
        result.current[1].refetch()
      })
      await waitForNextUpdate()
      expect(requests).toBe(2)
    })
  })
})
