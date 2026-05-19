"use client"

import { useState } from "react"


export default function Login(){

const [email,setEmail] = useState("")
const [senha, setSenha] = useState("")
const [mostraSenha, setMostraSenha] = useState(false)
const [manterConectado, setMaterConectado] = useState(false)


async function handleLogin(){


    try{
        const resposta = await fetch("http://localhost:3000/login",{
        method: "POST",
        headers: {"Content-Type" : "application/json"},
        body: JSON.stringify({email,senha})
})

        if(!resposta.ok){
            throw new Error("Erro ao buscar os dados")
        }

        const dados = await resposta.json();
        console.log(dados)
    } 
    catch(error){
        console.log("Ocoreu um erro", error);
    }



}

return(
    <>
    <h1>
            Barbearia do Higor
    </h1>
    <section>

        <h3>Entre na sua conta</h3>  

        <input type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
         />

        <input 
        type={mostraSenha ? "text" : "password" }
        value={senha}
        onChange={(s) => setSenha(s.target.value)}
        />

        <button onClick={() => setMostraSenha(!mostraSenha)}>
            olhinhos
        </button>

        <input
         type="checkbox"
        checked={manterConectado}
        onChange={(c) => setMaterConectado(!manterConectado)}
        />

        <a href="#">Cria conta</a>

        <button onClick={() => handleLogin()}>
            Entrar
        </button>

    </section>
    </>
)


}