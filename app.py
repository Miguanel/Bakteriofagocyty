from flask import Flask, render_template, request

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.after_request
def apply_js_header(response):
    if request.path.endswith('.js'):
        response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    if request.path.endswith('.css'):
        response.headers['Content-Type'] = 'text/css; charset=utf-8'
    return response

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)