"""Exécuter les tests JS sans dépendance via JavaScriptCore sur macOS."""
import ctypes, pathlib, json
root=pathlib.Path(__file__).resolve().parent.parent
j=ctypes.CDLL('/System/Library/Frameworks/JavaScriptCore.framework/JavaScriptCore')
ptr=ctypes.c_void_p
j.JSGlobalContextCreate.argtypes=[ptr];j.JSGlobalContextCreate.restype=ptr
j.JSStringCreateWithUTF8CString.argtypes=[ctypes.c_char_p];j.JSStringCreateWithUTF8CString.restype=ptr
j.JSEvaluateScript.argtypes=[ptr,ptr,ptr,ptr,ctypes.c_int,ctypes.POINTER(ptr)];j.JSEvaluateScript.restype=ptr
j.JSValueToStringCopy.argtypes=[ptr,ptr,ctypes.POINTER(ptr)];j.JSValueToStringCopy.restype=ptr
j.JSStringGetMaximumUTF8CStringSize.argtypes=[ptr];j.JSStringGetMaximumUTF8CStringSize.restype=ctypes.c_size_t
j.JSStringGetUTF8CString.argtypes=[ptr,ctypes.c_char_p,ctypes.c_size_t]
ctx=j.JSGlobalContextCreate(None)
code=(root/'preparation-core.js').read_text()+'\n'+(root/'tests/preparation.test.js').read_text()+'\n'+'''globalThis.window=globalThis;globalThis.fakeTimers=[];globalThis.setTimeout=f=>{fakeTimers.push(f);return fakeTimers.length;};globalThis.clearTimeout=()=>{};globalThis.SpeechRecognition=class {start(){} abort(){this.aborted=true;}};globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};globalThis.availableVoices=[{name:'Amélie',lang:'fr-FR'}];globalThis.voiceListeners=[];globalThis.speechSynthesis={cancel(){},getVoices(){return availableVoices;},addEventListener(type,fn){if(type==='voiceschanged')voiceListeners.push(fn);},removeEventListener(type,fn){voiceListeners=voiceListeners.filter(x=>x!==fn);},speak(u){this.last=u;}};'''+(root/'preparation-voice.js').read_text()+'\n'+(root/'tests/voice.test.js').read_text()+'\n'+(root/'vehicle-motion.js').read_text()+'\n'+(root/'tests/vehicle.test.js').read_text()+'\nJSON.stringify(TEST_REPORT);'
script=j.JSStringCreateWithUTF8CString(code.encode());err=ptr();value=j.JSEvaluateScript(ctx,script,None,None,1,ctypes.byref(err))
string=j.JSValueToStringCopy(ctx,err.value or value,None);size=j.JSStringGetMaximumUTF8CStringSize(string);buf=ctypes.create_string_buffer(size);j.JSStringGetUTF8CString(string,buf,size)
print(buf.value.decode());raise SystemExit(1 if err.value else 0)
