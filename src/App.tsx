import React, { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react';

import './App.css';

type FunctionType = {
    title: string,
    hint: string,
    function: (text: string, ...param: string[]) => string,
}

function loadFunctions(): FunctionType[] {
    let load_cookie = document.cookie;
    let json_raw = "[]";
    if (load_cookie) {
        load_cookie.split(';').forEach(function (value) {
            let value_list: string[] = value.split('=');
            if (value_list[0] === 'functions') {
                json_raw = value_list[1];
            }
        });
    }
    try {
        return JSON.parse(json_raw, function (k, v) {
            if (k === 'function') {
                try {
                    return Function("return " + decodeURIComponent(v))();
                }
                catch (e) {
                    alert(`cookieに保存されていた一部のスクリプトの復元に失敗しました\n${e}`);
                    console.error(`cookieに保存されていた一部のスクリプトの復元に失敗しました\n${e}`);
                }
            }
            return v;
        });
    }
    catch (e) {
        alert(`cookieの復元に失敗しました\n${e}`);
        console.error(`cookieの復元に失敗しました\n${e}`);
        return [];
    }
}

function saveFunctions(functions: FunctionType[]) {
    let json = JSON.stringify(functions, function (k, v) {
        if (typeof v === 'function') {
            return encodeURIComponent(v.toString());
        }
        return v;
    })
    let cookie = 'functions=' + json + ';';
    document.cookie = cookie;
}

function App() {
    const [text, setText] = useState<string>("");
    const [functions, setFunctions] = useState<FunctionType[]>(loadFunctions);

    const dialog_ref = useRef<HTMLDialogElement>(null);
    const [addtitle, setAddtitle] = useState<string>("");
    const [addhint, setAddhint] = useState<string>("");
    const [addscript, setAddscript] = useState<string>("function(text, arg){\n  return text+arg;\n}");

    return (
        <div className="app">
            <textarea className='textfield' value={text} onChange={(evt) => { setText(evt.target.value) }} />
            <hr />
            <Functions text={text} setText={setText} functions={functions} setFunctions={setFunctions} />
            <hr />
            <div className='addfunc' onClick={() => { dialog_ref.current?.showModal(); }}>関数を追加</div>
            <dialog id='addfunc-dialog' className='outer-dialog' ref={dialog_ref} onClick={() => { dialog_ref.current?.close() }}>
                <div className='dialog' onClick={(evt) => { evt.stopPropagation(); }}>
                    <input className='titlefield' type='text' placeholder='関数の名前を入力' value={addtitle} onChange={(evt) => { setAddtitle(evt.target.value) }} /><br />
                    <input className='hintfield' type='text' placeholder='関数の説明を入力' value={addhint} onChange={(evt) => { setAddhint(evt.target.value) }} />
                    <textarea className='scriptfield' value={addscript} onChange={(evt) => { setAddscript(evt.target.value) }} />
                    <input className='scriptconfirm' type='button' value='確定' onClick={() => {
                        try {
                            const added_func: FunctionType = {
                                title: addtitle,
                                hint: addhint,
                                function: Function("return " + addscript)(),
                            }
                            added_func.function("This is Test Executing");
                            saveFunctions(functions.concat(added_func));
                            setFunctions(functions.concat(added_func));
                            dialog_ref.current?.close();
                        }
                        catch (e) {
                            alert(`構文エラーが発生しました\n${e}`);
                        }
                    }} />
                </div>
            </dialog>
        </div>
    );
}

function Functions({ text, setText, functions, setFunctions }: { text: string, setText: Dispatch<SetStateAction<string>>, functions: FunctionType[], setFunctions: Dispatch<SetStateAction<FunctionType[]>> }) {
    function getFunctionArgments(func: (text: string, ...args: any) => string) {
        let args_name = []
        const funcstr = func.toString();
        let bracket = 0;
        let last_comma = -1;
        let last_bracket = 0;
        let is_string = { single: false, double: false };
        let i = 0;
        for (; i < funcstr.length; i++) {
            if (!Object.values(is_string).includes(true)) {
                if (['(', '[', '{'].includes(funcstr[i])) {
                    if (bracket === 0) {
                        last_comma = i;
                    }
                    bracket++;
                    last_bracket = i;
                }
                else if ([')', ']', '}'].includes(funcstr[i])) {
                    bracket--;
                    if (bracket < 1) {
                        if (last_comma !== -1) {
                            args_name.push(funcstr.substring(last_comma + 1, i).trim());
                            last_comma = -1;
                        }
                        break;
                    }
                }
                else if (funcstr[i] === ',' && bracket === 1) {
                    if (last_comma !== -1) {
                        args_name.push(funcstr.substring(last_comma + 1, i).trim());
                    }
                    last_comma = i;
                }
                else if (funcstr[i] === '=' && last_comma !== -1) {
                    args_name.push(funcstr.substring(last_comma + 1, i).trim());
                    last_comma = -1;
                }
            }
            if (funcstr[i] === `'` && !is_string.double && funcstr[i - 1] !== '\\') {
                is_string.single = !is_string.single;
            }
            else if (funcstr[i] === `"` && !is_string.single && funcstr[i - 1] !== '\\') {
                is_string.double = !is_string.double;
            }
        }
        if (funcstr.substring(last_bracket + 1, i).trim().length === 0) {
            return [];
        }
        return args_name;
    }
    const [input_args, setInputArgs] = useState<string[][]>(Array(functions.length).fill([]));
    const funcs: JSX.Element[] = [];
    while (input_args.length < functions.length) {
        input_args.push([]);
    }
    functions.forEach(function (elm, index) {
        const args_name = getFunctionArgments(elm.function);
        const args: JSX.Element[] = [];
        while (input_args[index].length < args_name.length - 1) {
            input_args[index].push("");
        }
        for (let i = 1; i < args_name.length; i++) {
            args.push((
                <input type='text' key={`${index}-${i}`} value={input_args[index][i - 1]} placeholder={args_name[i]} onClick={(evt) => { evt.stopPropagation(); }} onChange={(evt) => {
                    let new_input_args = [...input_args];
                    new_input_args[index][i - 1] = evt.target.value;
                    setInputArgs(new_input_args);
                }} />
            ));
        }
        funcs.push((
            <div className='function' key={`${index}`}>
                <div className='function-button' onClick={() => {
                    try{
                        let result: string = elm.function(text, ...input_args[index])
                        if(typeof result !== 'string'){
                            throw Error("Returned value is not string.");
                        }
                        setText(result);
                    }
                    catch(e){
                        alert(`ランタイムエラーが発生しました\n${e}`);
                    }
                }}>
                    <div className='title'>{elm.title}</div>
                    <div className='hint'>{elm.hint}</div>
                    {args}
                </div>
                <div className='delete' onClick={() => {
                    saveFunctions(functions.filter((elm, i) => i !== index));
                    setFunctions(functions.filter((elm, i) => i !== index));
                }}>✕</div>
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
