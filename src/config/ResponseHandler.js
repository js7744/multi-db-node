export const responseHandler = (data, totalCount, hasError, message) => {
    return {
        data,
        hasError: hasError || false,
        message: message || '',
        totalCount: totalCount || 0
    }
}