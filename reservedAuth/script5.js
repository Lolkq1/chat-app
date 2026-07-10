const btn_enviar = document.querySelector("#btn_send")
let a = document.location.toString().indexOf('/newchat/')
let b = document.location.toString().slice(a)
let b2 = document.location.toString().slice(a+9)
const chats = document.querySelector("#sidebar")
        fetch('/chats').then(res => res.text()).then(res2 => JSON.parse(res2)).then(obj => {
            for (x of obj) {
                console.log(x)
                let card = document.createElement('div')
                card.className = 'card my-1'
                card.style = 'width:100%; height:70px;'
                let cbody = document.createElement('div')
                card.appendChild(cbody)
                cbody.className = 'card-body p-0'
                cbody.style = 'width:100%; height: 100%;'
                let img = document.createElement('img')
                img.src = '/pfp.png'
                img.className = 'card-image m-3'
                img.style = 'width: 40px; height: 40px; border-radius: 100%; box-shadow: 0 0 2px; display: inline;'
                cbody.appendChild(img)
                let a = document.createElement('a')
                a.className = 'card-text'
                a.style = 'display:inline; text-decoration:none;'
                a.href = '/chat/'+x.token
                a.textContent = x.nome
                cbody.appendChild(a)
                chats.appendChild(card)
            }
        })

btn_enviar.addEventListener('click', (e) => {
    e.preventDefault()
    const txt = document.querySelector("#txt")
    if (txt.value && txt.value.length > 0) {
        fetch('/chats'+b, {
            method: 'PUT'
        }).then(res => {
            if (res.ok) {
                res.text().then(obj => {
                    fetch(`/chats/mensagem/${obj}`, {
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