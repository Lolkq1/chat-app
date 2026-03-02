const btn = document.querySelector("#btn")
const emailinp = document.querySelector("#email")
const senhainp = document.querySelector("#senha")

btn.addEventListener('click', () => {
    fetch('/login', {
        method: 'POST',
        body: JSON.stringify({
            email: emailinp.value,
            senha: senhainp.value
        }),
        headers: {
            'content-type':'application/json'
        }
    }).then(res => {
        res.text().then(obj => {alert(obj)})
        if (res.ok) {
            document.location.href='/'
        }
    })
})