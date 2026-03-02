const btn = document.querySelector("#btn")
const nomeinp = document.querySelector("#nome")
const emailinp = document.querySelector("#email")
const senhainp = document.querySelector("#senha")

btn.addEventListener('click', () => {
    fetch('/criar', {
        method: 'POST',
        body: JSON.stringify({
            nome: nomeinp.value,
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