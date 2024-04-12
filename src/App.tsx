import React, { Dispatch, SetStateAction, useState, useRef } from 'react';
import './App.css';

type FunctionType = {
    title: string,
    hint: string,
    function: (text: string, ...param: string[]) => string,
}

function App() {
    const [text, setText] = useState<string>("");
    const [functions, setFuncs] = useState<FunctionType[]>([]);
    const dialog_ref = useRef<HTMLDialogElement>(null);
    const [addtitle, setAddtitle] = useState<string>("");
    const [addhint, setAddhint] = useState<string>("");
    const [addscript, setAddscript] = useState<string>("function(text){\n  return text;\n}");

    return (
        <div className="app">
            <textarea className='textfield' value={text} onChange={(evt) => { setText(evt.target.value) }} />
            <Functions text={text} setText={setText} functions={functions} />
            <div className='addfunc' onClick={() => { dialog_ref.current?.showModal(); }}>関数を追加</div>
            <dialog id='addfunc-dialog' className='dialog' ref={dialog_ref}>
                <input className='titlefield' type='text' placeholder='関数の名前を入力' value={addtitle} onChange={(evt) => { setAddtitle(evt.target.value) }}/><br />
                <input className='hintfield' type='text' placeholder='関数の説明を入力' value={addhint} onChange={(evt) => { setAddhint(evt.target.value) }}/>
                <textarea className='scriptfield' value={addscript} onChange={(evt) => { setAddscript(evt.target.value) }}/>
                <input className='scriptconfirm' type='button' value='確定' onClick={() => {
                    try{
                        const added_func: FunctionType = {
                            title: addtitle,
                            hint: addhint,
                            function: new Function("return " + addscript)(),
                        }
                        setFuncs(functions.concat(added_func));
                        dialog_ref.current?.close();
                    }
                    catch(e){
                        alert(`スクリプトエラー\n${e}`);
                    }
                }} />
            </dialog>
        </div>
    );
}

function Functions({ text, setText, functions }: { text: string, setText: Dispatch<SetStateAction<string>>, functions: FunctionType[] }) {
    const funcs: JSX.Element[] = [];
    functions.forEach(function (elm, index) {
        funcs.push((
            <div className='function' onClick={() => { setText(elm.function(text)) }} key={`func-${index}`}>
                <h2>{elm.title}</h2>
                {elm.hint}
            </div>
        ));
    });
    return (
        <div className='functions'>
            {funcs}
        </div>
    )
}

export default App;
