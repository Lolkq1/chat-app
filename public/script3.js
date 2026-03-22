const btn = document.querySelector("#btn")
const id = window.location.pathname.slice([window.location.pathname.indexOf('id')]).split('=')
if (Number.isNaN(id)) {
    document.location.href = '/'
} else {
    fetch(`/pesquisa?chave=id&id=${id}`).then(res => {
    if (res.ok) {
        res.text().then(obj2 => JSON.parse(obj2)).then(obj => {
            const nome = document.querySelector("#nome")
            const bio = document.querySelector("#descricao")
            nome.textContent = obj.nome
            bio.textContent = obj.bio
        })
    }
})
}
