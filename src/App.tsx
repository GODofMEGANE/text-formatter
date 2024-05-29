import React, { Dispatch, SetStateAction, useState, useRef } from 'react';
import AceEditor from 'react-ace';
import { IoMdSettings, IoMdCloseCircle } from "react-icons/io";
import "ace-builds/webpack-resolver";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-solarized_light";
import "ace-builds/src-noconflict/ext-language_tools";

import './App.css';

export type EditorProps = {
    fileType: string;
    contents: string;
    readOnly: boolean;
    onChange?: (content: string) => void;
    theme?: string;
};

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
                    // eslint-disable-next-line
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
    const [replace_index, setReplaceIndex] = useState<number>(-1);
    const [addtitle, setAddtitle] = useState<string>("");
    const [addhint, setAddhint] = useState<string>("");
    const [addscript, setAddscript] = useState<string>("function(text, arg){\n  return text+arg;\n}");
    const [is_testing, setIsTesting] = useState<boolean>(true);

    function showFunctionDialog(clicked_index: number = -1){
        if(clicked_index !== -1){
            setReplaceIndex(clicked_index);
            setAddtitle(functions[clicked_index].title);
            setAddhint(functions[clicked_index].hint);
            setAddscript(functions[clicked_index].function.toString());
        }
        else{
            setReplaceIndex(clicked_index);
        }
        dialog_ref.current?.showModal();
    }

    return (
        <div className="app">
            <textarea className='textfield' value={text} placeholder='ここに関数を適用させる文字列を入力' onChange={(evt) => { setText(evt.target.value) }} />
            <hr />
            <Functions text={text} setText={setText} functions={functions} setFunctions={setFunctions} showFunctionDialog={showFunctionDialog} />
            <hr />
            <div className='addfunc' onClick={() => {
                showFunctionDialog();
            }}>関数を追加</div>
            <dialog id='addfunc-dialog' className='outer-dialog' ref={dialog_ref} onClick={() => { dialog_ref.current?.close() }}>
                <div className='dialog' onClick={(evt) => { evt.stopPropagation(); }}>
                    <input className='titlefield' type='text' placeholder='関数の名前を入力' value={addtitle} onChange={(evt) => { setAddtitle(evt.target.value) }} /><br />
                    <input className='hintfield' type='text' placeholder='関数の説明を入力' value={addhint} onChange={(evt) => { setAddhint(evt.target.value) }} />
                    <AceEditor className='scriptfield' theme="solarized_light" mode='javascript' minLines={10} maxLines={30} width='100%' setOptions={{
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: true,
                        enableSnippets: true,
                        showLineNumbers: true,
                        tabSize: 2,
                    }} value={addscript} onChange={(evt) => { setAddscript(evt) }} />
                    <input className='scriptconfirm' type='button' value='確定' onClick={() => {
                        try {
                            const added_func: FunctionType = {
                                title: addtitle,
                                hint: addhint,
                                // eslint-disable-next-line
                                function: Function("return " + addscript)(),
                            }
                            if(is_testing){
                                added_func.function("This is Test Executing");
                            }
                            if(replace_index === -1){
                                saveFunctions(functions.concat(added_func));
                                setFunctions(functions.concat(added_func));
                            }
                            else{
                                const new_functions: FunctionType[] = [...functions];
                                new_functions.splice(replace_index, 1, added_func);
                                saveFunctions(new_functions);
                                setFunctions(new_functions);
                            }
                            dialog_ref.current?.close();
                        }
                        catch (e) {
                            alert(`構文エラーが発生しました\n${e}`);
                        }
                    }} />
                    <label>
                        <input type="checkbox" checked={is_testing} onChange={(evt)=>{setIsTesting(evt.target.checked)}}/>
                        確定時にテスト実行
                    </label>
                </div>
            </dialog>
        </div>
    );
}

function Functions({ text, setText, functions, setFunctions, showFunctionDialog }: {
    text: string, setText: Dispatch<SetStateAction<string>>, functions: FunctionType[], setFunctions: Dispatch<SetStateAction<FunctionType[]>>, showFunctionDialog: (replace_index?: number)=>void
}) {
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
                <div key={`func-${index}-${i}`}>
                    <br/>
                    <input type='text' value={input_args[index][i - 1]} placeholder={args_name[i]} onClick={(evt) => { evt.stopPropagation(); }} onChange={(evt) => {
                        let new_input_args = [...input_args];
                        new_input_args[index][i - 1] = evt.target.value;
                        setInputArgs(new_input_args);
                    }} />
                </div>
            ));
        }
        funcs.push((
            <div className='function' key={`func-${index}`}>
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
                <IoMdSettings className='edit' size={'2rem'} onClick={() => {
                    showFunctionDialog(index);
                }}/>
                <IoMdCloseCircle className='delete' size={'2rem'} onClick={() => {
                    if(window.confirm(`本当に関数 ${functions[index].title} を削除しますか？`)){
                        saveFunctions(functions.filter((elm, i) => i !== index));
                        setFunctions(functions.filter((elm, i) => i !== index));
                    }
                }}/>
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
