module.exports = class Request {
  constructor(url, method, formData, contentType) {
    this.url = url;
    this.method = method || 'GET';
    this.formData = formData || null;
    this.contentType = contentType || 'application/json';
  }

  send() {
    const req = new XMLHttpRequest();
    req.open(this.method, this.url);
    req.setRequestHeader('Content-Type', this.contentType);

    return new Promise((resolve, reject) => {
      req.addEventListener('load', () => {
        const contentType = req.getResponseHeader('Content-Type');
        if (contentType == 'application/json') {
          resolve(JSON.parse(req.response));
        }
        resolve(req.response);
      });
      req.addEventListener('error', () => reject(req.statusText));
      if (this.contentType == 'application/json' && this.formData) {
        this.formData = JSON.stringify(this.formData);
      }
      req.send(this.formData);
    });
  }
}
