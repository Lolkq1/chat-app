const btn_enviar = document.querySelector("#btn_send")
let a = document.location.toString().indexOf('/newchat/')
let b = document.location.toString().slice(a)
let b2 = document.location.toString().slice(a+9)
btn_enviar.addEventListener('click', () => {
    const txt = document.querySelector("#txt")
    if (txt.value && txt.value.length > 0) {
        fetch(b, {
            method: 'PUT'
        }).then(res => {
            if (res.ok) {
                res.text().then(obj => {
                    fetch(`/mensagem/${obj}`, {
                        method: 'POST',
                        body: JSON.stringify({
                            msg: txt.value
                        }),
                        headers: {"content-type": "application/json"}
                    }).then(res2 => {
                        if (res2.ok) {
                            document.location.href = `/chat/${obj}`
                        }
                    })
                })
            } else {
                alert('não foi possível criar novo chat.')
            }
        })
    }
})