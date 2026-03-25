
class ApiResponse {
    constructor(statusCode, data, success, messagae= "Successs"){
      this.statusCode = statusCode,
      this.data = data,
      this.message = messagae,
      this.success = success
    }
}

export { ApiResponse}