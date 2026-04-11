const btn_enviar = document.querySelector("#btn_send")
let a = document.location.toString().indexOf('/newchat/')
let b = document.location.toString().slice(a)
let b2 = document.location.toString().slice(a+9)
btn_enviar.addEventListener('click', () => {
    const txt = document.querySelector("#txt")
    if (txt.value && txt.value.length > 0) {
        fetch(b).then(res => {
            if (res.ok) {
                res.text().then(obj => {
                    fetch(`/message/${b2}`, {
                        method: 'POST',
                        body: JSON.stringify({
                            msg: msg.value
                        }),
                        "content-type": "application/json"
                    }).then(res => {
                        if (res.ok) {
                            
                        }
                    })
                })
            }
        })
    }
})