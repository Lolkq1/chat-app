let a = document.location.toString().indexOf('chat/')+5
let b = document.location.toString().slice(a)
fetch(`/chats2/${b}`).then(res => {
    if (res.ok) {
        return 1
    } else {
        alert('a conversa não existe ou você não participa dela.')
        document.location.href = '/'
    }
})