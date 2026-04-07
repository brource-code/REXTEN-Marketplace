const AxiosResponseIntrceptorErrorCallback = (error) => {
    const status = error?.response?.status
    const data = error?.response?.data
    const msg =
        data && typeof data === 'object' && typeof data.message === 'string'
            ? data.message
            : error?.message
    console.error('Axios response error', { status, message: msg || 'Unknown error' })
}

export default AxiosResponseIntrceptorErrorCallback
