import { DEF_TGT } from "./index.js";

export const DEF_MEMBERS = [
  { id:"admin",      name:"管理者",    role:"admin",  team:"全体",  badge:"管理者", pw:"1111", target:0,       status:"active" },
  { id:"odagiri",    name:"小田切",    role:"leader", team:"杉山T", badge:"IS+FS", pw:"1111", target:DEF_TGT, status:"active" },
  { id:"hayaken",    name:"はやけん",  role:"FS",     team:"杉山T", badge:"FS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"naoki",      name:"なおき",    role:"IS",     team:"杉山T", badge:"IS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"suzuki_m",   name:"鈴木みのり",role:"FS",     team:"鈴木T", badge:"FS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"jumonji",    name:"十文字",    role:"IS",     team:"鈴木T", badge:"IS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"hion",       name:"ひおん",    role:"IS",     team:"鈴木T", badge:"IS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"naka",       name:"中",        role:"leader", team:"中村T", badge:"IS+FS", pw:"1111", target:DEF_TGT, status:"active" },
  { id:"hajime",     name:"はじめ",    role:"IS",     team:"中村T", badge:"IS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"aoki",       name:"青木",      role:"IS",     team:"中村T", badge:"IS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"nakamura_f", name:"中村",      role:"FS",     team:"中村T", badge:"FS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"yokoi",      name:"横井",      role:"leader", team:"渡部T", badge:"IS+FS", pw:"1111", target:DEF_TGT, status:"active" },
  { id:"uehara",     name:"上浦",      role:"IS",     team:"渡部T", badge:"IS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"ohta",       name:"太田",      role:"IS",     team:"渡部T", badge:"IS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"watanabe_f", name:"渡部",      role:"FS",     team:"渡部T", badge:"FS",    pw:"1111", target:DEF_TGT, status:"active" },
  { id:"sugiyama_t", name:"杉山天瑠",  role:"FS",     team:"全社FS",badge:"FS",    pw:"1111", target:DEF_TGT, status:"active" },
];

export const DEF_DEALS = [
  { id:1,  company:"株式会社アカリ",        plan:"MDCスタンダード", amount:48, is:"はじめ",     fs:"中",         team:"中村T", confidence:"70%", phase:"④決済者商談予定",     note:"2社比較中"   },
  { id:2,  company:"テックベース株式会社",   plan:"MDCスタンダード", amount:32, is:"青木",       fs:"中村",       team:"中村T", confidence:"70%", phase:"⑥稟議中",             note:"競合なし"    },
  { id:3,  company:"グローバルリンク",       plan:"MDCスモール",     amount:25, is:"上浦",       fs:"渡部",       team:"渡部T", confidence:"50%", phase:"③上長共有",           note:"予算確認中"  },
  { id:4,  company:"フューチャーズ株式会社", plan:"コンサル",        amount:58, is:"なおき",     fs:"はやけん",   team:"杉山T", confidence:"50%", phase:"⑤決済者共有",         note:"大型案件"    },
  { id:5,  company:"デジタルソリューション", plan:"MDCスモール",     amount:19, is:"十文字",     fs:"鈴木みのり", team:"鈴木T", confidence:"30%", phase:"①2nd",            note:"初回良好"    },
  { id:6,  company:"イノベーション合同会社", plan:"MDCスタンダード", amount:34, is:"はじめ",     fs:"中",         team:"中村T", confidence:"30%", phase:"社内資料すり合わせ", note:""            },
  { id:7,  company:"サクセス株式会社",       plan:"コンサル",        amount:42, is:"太田",       fs:"渡部",       team:"渡部T", confidence:"回収", phase:"⑦受注",              note:"5月受注"     },
  { id:8,  company:"ネクストビジョン",       plan:"コンサル",        amount:36, is:"上浦",       fs:"横井",       team:"渡部T", confidence:"50%", phase:"③上長共有",           note:""            },
  { id:9,  company:"スマートファクトリー社", plan:"Dash!",           amount:72, is:"なおき",     fs:"小田切",     team:"杉山T", confidence:"50%", phase:"社内資料すり合わせ", note:"DX推進"      },
  { id:10, company:"ライジングスター",       plan:"コンサル",        amount:51, is:"太田",       fs:"横井",       team:"渡部T", confidence:"70%", phase:"⑤決済者共有",         note:"役員承認待ち"},
];
