const btn_nome = document.querySelector("#btn_nome")
const btn_senha = document.querySelector("#btn_senha")
const btn_email = document.querySelector("#btn_email")
const btn_bio = document.querySelector("#btn_bio")
const configdiv = document.querySelector("#config_div")
const label_e = document.querySelector("#labele")
const btn_att = document.querySelector("#btn_att")
const container = document.querySelector("#main")
const nome = document.querySelector("#nome")
const email = document.querySelector("#email")
const bio = document.querySelector("#bio")

fetch('/pesquisa?chave=dados').then(res => res.text()).then(obj => JSON.parse(obj)).then(res2 => {
        nome.textContent+=res2.nome
        email.textContent+=res2.email
        bio.textContent+=res2.bio
})

function enejota(b, msg) {
    container.style.display = 'none'
    label_e.textContent = msg;
    btn_att.addEventListener('click', async () => {
        const senha = document.querySelector("#senha")
        const e = document.querySelector("#e")
        let a = await fetch(`/config/`+b, {
            method: 'PATCH',
            body: JSON.stringify({
                prop: e.value,
                senha: senha.value
            }),
            headers: {
                'content-type':'application/json'
            }
        })
        if (a.ok) {
            alert('dados alterados com sucesso!')
            document.location.reload()
        }
    })
    container.style.display = 'none'
    configdiv.style.display = 'block';
}

btn_nome.addEventListener('click', () => {
    enejota('nome', 'Insira seu novo nome de usuário.')
})

btn_email.addEventListener('click', ()=> {
    enejota('email', 'Insira seu novo e-mail.')    
})

btn_bio.addEventListener('click', () => {
    enejota('bio', 'Insira sua nova bio')
})

btn_senha.addEventListener('click', () => {
    enejota('senha', 'Insira sua nova senha.')
})
