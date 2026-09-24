/* =========================================================
   範例資料（僅在第一次使用、尚未有任何資料時自動載入一次）
   內容依你提供的 2026 年 6 月截圖重建，數字為對照用途，
   正式使用前請自行核對、修改或刪除。
   ========================================================= */
window.SEED_DATA = {
  modules: {
    director: { entries: [
      // ---- 醫院費用：行政公補款（無會計代號）----
      { id:'s1', month:'2026-06', category:'hospital_expense', fundSource:'hospital',
        item:'11406 中心定期會議', subitem:'（$3,995 供參，未列入本月墊付）', expense:0, income:0,
        directorAdvanced:false, settled:false, settledMonth:null, note:'20260630 已給中心' },
      { id:'s2', month:'2026-06', category:'hospital_expense', fundSource:'hospital',
        item:'印刷品（名片）', subitem:'（$288 供參，未列入本月墊付）', expense:0, income:0,
        directorAdvanced:false, settled:false, settledMonth:null, note:'20260630 已給中心' },
      { id:'s3', month:'2026-06', category:'hospital_expense', fundSource:'hospital',
        item:'印刷品（簡報影印）', subitem:'（$1,728 供參，未列入本月墊付）', expense:0, income:0,
        directorAdvanced:false, settled:false, settledMonth:null, note:'20260630 已給中心' },
      // ---- 醫院費用：差旅費（主任自行墊付，待歸還）----
      { id:'s4', month:'2026-06', category:'hospital_expense', fundSource:'hospital',
        item:'2025-06-04 蒙古義診', subitem:'機票＋簽證＋生活費', expense:56815, income:0,
        directorAdvanced:true, settled:false, settledMonth:null,
        note:'AE1140601926（內科申請）費用轉停（傳票號碼：11409C000256）' },
      { id:'s5', month:'2026-06', category:'hospital_expense', fundSource:'hospital',
        item:'202601 范教授來院指導', subitem:'漏帳', expense:24000, income:0,
        directorAdvanced:true, settled:false, settledMonth:null,
        note:'AE1150500558 費用轉停（傳票號碼：11505C000276）' },
      { id:'s5b', month:'2026-06', category:'hospital_expense', fundSource:'hospital',
        item:'部門小禮物', subitem:'新進同仁歡迎小禮', expense:600, income:0,
        paymentType:'waived', settled:false, settledMonth:null, note:'主任自己請客，不需歸還' },

      // ---- 113221T5：軟體與工具類支出 ----
      { id:'s6', month:'2026-06', category:'code_113221T5', fundSource:'school',
        item:'軟體工具使用費', subitem:'04月份（Claude Pro、ChatGPT Plus、V0 Premium、iCloud）', expense:0, income:2212,
        directorAdvanced:true, settled:true, settledMonth:'2026-06', note:'2026.06.05 入帳（上月墊付款本月沖帳）' },
      { id:'s7', month:'2026-06', category:'code_113221T5', fundSource:'school',
        item:'軟體工具使用費', subitem:'05月份（Claude Pro、ChatGPT Plus、iCloud）', expense:1560, income:0,
        directorAdvanced:true, settled:false, settledMonth:null, note:'核銷中' },
      { id:'s8', month:'2026-06', category:'code_113221T5', fundSource:'school',
        item:'軟體工具使用費', subitem:'Claude Max 2.0 續訂（2026.5月）', expense:0, income:2763,
        directorAdvanced:true, settled:true, settledMonth:'2026-06', note:'2026.06.26 入帳（上月墊付款本月沖帳）' },
      { id:'s9', month:'2026-06', category:'code_113221T5', fundSource:'school',
        item:'軟體工具使用費', subitem:'06月份（Claude Pro、ChatGPT Plus、iCloud、Claude Max）', expense:4699, income:0,
        directorAdvanced:true, settled:false, settledMonth:null, note:'核銷中' },

      // ---- 113221T3：審查／登記費用 ----
      { id:'s10', month:'2026-06', category:'code_113221T3', fundSource:'school',
        item:'查驗登記審查費', subitem:'第二類醫療器材許可證申請＿雙側肺潤濕', expense:58000, income:0,
        directorAdvanced:true, settled:false, settledMonth:null, note:'核銷中' },

      // ---- 11442501：工具授權（跨年度） ----
      { id:'s11', month:'2026-06', category:'code_11442501', fundSource:'school',
        item:'軟體工具使用費（2026-2027）', subitem:'Parallels Pro Edition（可用期間 20260221–20270221）匯率以33計', expense:3960, income:0,
        directorAdvanced:true, settled:false, settledMonth:null, note:'核銷中' },
      { id:'s12', month:'2026-06', category:'code_11442501', fundSource:'school',
        item:'軟體工具使用費（2026-2027）', subitem:'Apple Developer Program（可用期間 20260415–20270415）', expense:3400, income:0,
        directorAdvanced:true, settled:false, settledMonth:null, note:'核銷中' },
      { id:'s13', month:'2026-06', category:'code_11442501', fundSource:'school',
        item:'軟體工具使用費（2026-2027）', subitem:'NEJM AI（可用期間 20260422–20270422）匯率以33計', expense:6567, income:0,
        directorAdvanced:true, settled:false, settledMonth:null, note:'核銷中' },
      { id:'s14', month:'2026-06', category:'code_11442501', fundSource:'school',
        item:'軟體工具使用費（2026-2027）', subitem:'Parallels Pro Edition 補足額', expense:678, income:0,
        directorAdvanced:true, settled:false, settledMonth:null,
        note:'待收集憑證核銷（因與王剛 Notion 一起申請，所以還沒法核銷）' },

      // ---- 非主任開銷，另外申請給中心的費用（代轉，不算欠款）----
      { id:'s15', month:'2026-06', category:'passthrough', fundSource:'school',
        item:'鎖匙費', subitem:'（$1,500 供參）', expense:0, income:0,
        paymentType:'passthrough', settled:true, settledMonth:'2026-06', note:'20260630 已給中心' },
      { id:'s16', month:'2026-06', category:'passthrough', fundSource:'school',
        item:'聚餐費_4/24', subitem:'', expense:3840, income:0,
        paymentType:'passthrough', settled:true, settledMonth:'2026-06', note:'（2026.06.05）--->靖主任領出給中心經費' },
      { id:'s17', month:'2026-06', category:'passthrough', fundSource:'school',
        item:'聚餐費_5/08', subitem:'', expense:3840, income:0,
        paymentType:'passthrough', settled:true, settledMonth:'2026-06', note:'（2026.06.18）--->靖主任領出給中心經費' },
      { id:'s18', month:'2026-07', category:'passthrough', fundSource:'school',
        item:'誤餐費_7/10', subitem:'', expense:0, income:5640,
        paymentType:'passthrough', settled:false, settledMonth:null, note:'（2026.07.10）--->請主任領出給中心經費' },
    ]},
    hospital: { entries: [] },
    pettycash: { entries: [] },
    teamdinner: { entries: [] },
    project: { accounts: [
      {
        id:'pj1', code:'114221T7', label:'國科會第四年_AIRIC經費', period:'114/09/01 ～ 116/04/30',
        quotas:{ personnel:3000000, misc:1119900, equipment:1000000 },
        entries:[
          { id:'pe1', type:'personnel', item:'黃俊皓', role:'專任助理人員（高級）', period:'115年04月份薪資（1150401-1150831）',
            baseSalary:77000, pension:4812, laborIns:4008, healthIns:3881, workInjuryIns:80, applied:89781, actual:89781, status:'done', note:'聘任完成' },
          { id:'pe1b', type:'personnel', item:'黃俊皓', role:'專任助理人員（高級）', period:'115年05月份薪資（1150401-1150831）',
            baseSalary:77000, pension:4812, laborIns:4008, healthIns:3881, workInjuryIns:80, applied:89781, actual:89781, status:'processing', note:'聘任完成' },
          { id:'pe2', type:'personnel', item:'周怡均', role:'專任助理人員（中級）', period:'115年04月份薪資（1150401-1150831）',
            baseSalary:50000, pension:3036, laborIns:4008, healthIns:2449, workInjuryIns:56, applied:59493, actual:59493, status:'done', note:'聘任完成' },
          { id:'pe3', type:'personnel', item:'郭乃維', role:'專任助理人員（中級，轉院聘）', period:'115年04月份薪資（1150401-1150831）',
            baseSalary:63000, pension:3828, laborIns:4008, healthIns:3087, workInjuryIns:70, applied:73993, actual:73993, status:'done', note:'聘任完成' },
          { id:'pe4', type:'misc', orderNo:'11412680（20260414上單）', item:'課程費', desc:'ISO42001主導稽核員課程（8小時/天，共5日），上限25人', unit:'人', qty:25, unitPrice:20580, applied:514500, actual:462500, status:'done',
            note:'5/11限制性招標決標，決標價18,500/人 × 25人',
            log:[ {date:'2026-04-14', text:'表單送出申請'}, {date:'2026-05-11', text:'限制性招標決標，決標價 18,500/人'}, {date:'2026-06-20', text:'核銷完成，實付 462,500'} ] },
          { id:'pe5', type:'misc', orderNo:'11414821（20260525上單）', item:'領證費', desc:'雙側肺浸潤查驗登記領證費', unit:'次', qty:1, unitPrice:1500, applied:1500, actual:1500, status:'done', note:'核銷完成（入主任）2026.07.24已付款' },
          { id:'pe6', type:'misc', orderNo:'11416348（20260617上單）', item:'軟體工具使用費（2026.07月份）', desc:'Claude Pro／ChatGPT Plus／iCloud／Claude Max 續訂（主任、王副等）', unit:'月', qty:1, unitPrice:700, applied:634, actual:7980, status:'processing', note:'核銷中：轉送水湳 7/28（入主任及王副）' },
          { id:'pe7', type:'equipment', orderNo:'115A061306（20260618上單）', item:'個人電腦', desc:'ASUS 華碩 Ascent GX10 桌上型 AI 超級電腦（心導管室用）', unit:'台', qty:1, unitPrice:190000, applied:190000, actual:170000, status:'processing', note:'申請中：7/13 決標（米多多），決標價 170,000' },
          { id:'pe8', type:'equipment', orderNo:'115A070466（20260727上單）', item:'人工智慧電腦', desc:'Blackwell GPU、20-core Arm CPU、128GB', unit:'台', qty:2, unitPrice:210000, applied:420000, actual:420000, status:'applying', note:'申請中：莊千蔓（威雲）' },
        ]
      }
    ]},
  }
};
