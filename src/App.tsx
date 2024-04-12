import React, { Dispatch, SetStateAction, useState } from 'react';
import './App.css';

function App() {
    let functions: Functions[] = [];
    const [text, setText] = useState<string>("");
    
    return (
        <div className="app">
            <input className='textfield' type='text' value={text} onChange={(evt)=>{setText(evt.target.value)}}/>
            <Function text={text} setText={setText} func={{
                title: "TEST",
                hint: "test",
                function: function(param:string){
                    return param.split("").reverse().join("");
                }
            }}/>
            <div className='addfunc'>関数を追加</div>
            <dialog id='addfunc-dialog' className='dialog'>

            </dialog>
        </div>
    );
}

type Functions = {
    title: string,
    hint: string,
    function: (text: string, ...param: string[])=>string,
}

function Function({text, setText, func}:{text: string, setText:Dispatch<SetStateAction<string>>, func: Functions}) {
    return (
        <div className='function' onClick={()=>{setText(func.function(text))}}>
            <h2>{func.title}</h2>
            {func.hint}
        </div>
    )
}

export default App;
