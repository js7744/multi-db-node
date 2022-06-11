export class ErrorHandler extends Error {
    constructor(statusCode, message) {
        super()
        this.statusCode = statusCode
        this.message = message
    }
}

export const handleError = (err, res) => {
    const statusCode = err.statusCode ? err.statusCode : 500;
    const message = err.message ? err.message : "Something went wrong"
    res.status(statusCode).json({
        hasError: true,
        statusCode: statusCode,
        message,
    })
}

export const errorHandle = (statusCode, err, res) => {
    res.status(statusCode).json({
        hasError: true,
        statusCode: statusCode,
        message: err,
    })
}