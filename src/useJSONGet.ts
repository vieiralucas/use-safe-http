import { match } from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { useCallback, useEffect, useMemo, useState } from 'react'

type LoadingState = {
  _tag: 'loading'
}

type NetworkErrorState = {
  _tag: 'network-error'
  error: Error
  refetching: boolean
}

type SuccessState<T> = {
  _tag: 'success'
  status: number
  json: T
  refetching: boolean
}

type DecodingErrorState = {
  _tag: 'decoding-error'
  json: unknown
  status: number
  errors: t.Errors
  refetching: boolean
}

type State<T> =
  | LoadingState
  | SuccessState<T>
  | NetworkErrorState
  | DecodingErrorState

export const isLoadingState = <T>(state: State<T>): state is LoadingState =>
  state._tag === 'loading'

export const isSuccessState = <T>(state: State<T>): state is SuccessState<T> =>
  state._tag === 'success'

export const isNetworkErrorState = <T>(
  state: State<T>
): state is NetworkErrorState => state._tag === 'network-error'

export const isDecodingErrorState = <T>(
  state: State<T>
): state is DecodingErrorState => state._tag === 'decoding-error'

type UseJSONGetAPI = {
  refetch: () => void
}

type UseJSONGet<T> = [State<T>, UseJSONGetAPI]

export const useJSONGet = <T>(
  url: string,
  decoder: t.Decoder<unknown, T>,
  headers?: Record<string, string>
): UseJSONGet<T> => {
  const [state, setState] = useState<State<T>>({ _tag: 'loading' })

  useEffect(() => {
    const shouldFetch = isLoadingState(state) || state.refetching
    if (!shouldFetch) {
      return
    }

    let isActive = true
    fetch(url, { headers })
      .then(async (res) => {
        if (!isActive) {
          return
        }

        const json = await res.json()

        if (!isActive) {
          return
        }

        setState(
          pipe(
            decoder.decode(json),
            match(
              (errors): State<T> => ({
                _tag: 'decoding-error',
                json: json,
                status: res.status,
                errors,
                refetching: false,
              }),
              (json): State<T> => ({
                _tag: 'success',
                status: res.status,
                json,
                refetching: false,
              })
            )
          )
        )
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        setState({ _tag: 'network-error', error, refetching: false })
      })

    return () => {
      isActive = false
    }
  }, [url, state, setState])

  const refetch = useCallback(() => {
    setState((state) => {
      if (isLoadingState(state) || state.refetching) {
        return state
      }

      return { ...state, refetching: true }
    })
  }, [setState])

  useEffect(() => {
    setState((state) => {
      if (isLoadingState(state) || state.refetching) {
        return state
      }

      return { ...state, refetching: true }
    })
  }, [url, setState])

  const api = useMemo(
    () => ({
      refetch,
    }),
    [refetch]
  )

  return [state, api]
}
