"use client"
import "./login.css";
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"


export default function Login(){

const [email,setEmail] = useState("")
const [senha, setSenha] = useState("")
const [mostraSenha, setMostraSenha] = useState(false)
const [manterConectado, setMaterConectado] = useState(false)


async function handleLogin(){


    try{
        const resposta = await fetch("http://localhost:3333/login",{
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

    <section className="container">
        <h1 className="titulo">
            Barbearia do Higor
        </h1>

        <div className="foto">
            <img src="" alt="" />
        </div>
        <div className="form">
            <h3>Entre na sua conta</h3>
            <input type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
             />
            <input
                type={mostraSenha ? "text" : "password" }
                value={senha}
                onChange={(s) => setSenha(s.target.value)}
                className="input"
            />
            <button
                type="button"
                onClick={() => setMostraSenha(!mostraSenha)}>
                {mostraSenha ? <EyeOff size={20} /> : <Eye size={20}/>}
            </button>
            <input
                type="checkbox"
                checked={manterConectado}
                onChange={(c) => setMaterConectado(!manterConectado)}
                className="input"
            />
            <a href="#">Cria conta</a>
            <button onClick={() => handleLogin()} className="btn-entrar">
                Entrar
            </button>
        </div>

    </section>
    </>
)


}