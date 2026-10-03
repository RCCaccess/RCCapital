window.rcRememberAdmin=localStorage.getItem('rc-admin-remember')==='1';
window.rcAdminAuthStorage={
 getItem:key=>sessionStorage.getItem(key)||localStorage.getItem(key),
 setItem:(key,value)=>{const chosen=window.rcRememberAdmin?localStorage:sessionStorage;const other=window.rcRememberAdmin?sessionStorage:localStorage;chosen.setItem(key,value);other.removeItem(key);},
 removeItem:key=>{sessionStorage.removeItem(key);localStorage.removeItem(key);}
};
window.rcChooseAdminSession=remember=>{
 window.rcRememberAdmin=!!remember;
 if(remember)localStorage.setItem('rc-admin-remember','1');else localStorage.removeItem('rc-admin-remember');
};
