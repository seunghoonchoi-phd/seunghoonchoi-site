---
title: "Office File Inspector: AI से बने PPT, Excel और Word की खराबियां जांचने वाला टूल"
seoTitle: "Office File Inspector: AI से बने PPT, Excel और Word की ओपन-सोर्स QA जांच"
date: 2026-06-16
categories: ["टूल"]
tags: ["ओपन-सोर्स", "ai", "Office File Inspector"]
subtitle: "साफ दिखने वाली गलतियां पकड़ें, लेकिन परिणाम की ऊंचाई कम न करें"
description: "Office File Inspector एक ओपन-सोर्स चेकर है जो AI से बने PowerPoint, Excel और Word में स्लाइड से बाहर गया टेक्स्ट, #REF! त्रुटि और बचा हुआ Markdown जैसी साफ दिखने वाली खराबियां पकड़ता है।"
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
aliases: ["/apps/llm-office-qa/"]
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="Office File Inspector आइकन">
  <div class="appcard__body">
    <span class="appcard__free">ओपन सोर्स (MIT)</span>
    <h3>Office File Inspector</h3>
    <p>AI से बने PowerPoint, Excel और Word में साफ दिखने वाली खराबियां जाँचने वाला चेकर, जो स्टाइल के फैसलों को जानबूझकर नहीं बदलता।</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">GitHub पर देखें -></a>
  </div>
</div>

जब आप LLM से स्लाइड, स्प्रेडशीट या दस्तावेज बनवाते हैं, तो अक्सर वही गलतियां दोहराई जाती हैं। टेक्स्ट स्लाइड से बाहर निकल जाता है, Excel में `#REF!` त्रुटि रह जाती है, कोई सेल संख्या जैसा दिखता है पर टेक्स्ट के रूप में सेव होता है, या Word दस्तावेज में Markdown बचा रह जाता है।

Office File Inspector केवल ऐसी साफ दिखने वाली खराबियां पकड़ता है। फॉन्ट की संख्या, बुलेट की संख्या, रंग या जानकारी की घनता जैसे फैसलों को यह जांच का नियम नहीं बनाता, क्योंकि ये चीजें लक्ष्य और संदर्भ पर निर्भर करती हैं। QA टूल का काम परिणाम की न्यूनतम गुणवत्ता को ऊपर उठाना है। उसे परिणाम की अधिकतम संभावना को कम नहीं करना चाहिए।

सबसे पहले इस्तेमाल होने वाली फाइल `check_office_file.py` है। PowerPoint, Excel और Word को इसी एक कमांड से जांचा जा सकता है।

```bash
python check_office_file.py report.pptx
python check_office_file.py model.xlsx
python check_office_file.py proposal.docx
```

अगर आप फाइल प्रकार के हिसाब से सीधे जांच करना चाहते हैं, तो `tools/check_powerpoint.py`, `tools/check_excel.py` और `tools/check_word.py` का उपयोग कर सकते हैं। अगर आप चाहते हैं कि कोई एजेंट Office फाइल बनाते ही उसे अपने आप जांचे, तो `integrations/auto_check_office_files.py` को hook के रूप में जोड़ सकते हैं।

पुराने लिंक टूटें नहीं, इसलिए GitHub repository URL अभी भी `llm-office-qa` है। लेकिन सार्वजनिक नाम, README और चलाने की संरचना Office File Inspector के आधार पर व्यवस्थित कर दी गई है।

[GitHub पर देखें ->](https://github.com/seunghoonchoi-phd/llm-office-qa)

मैंने इसे इस तरह क्यों बनाया, और QA परत को बेहतर परिणाम की संभावना क्यों नहीं रोकनी चाहिए -> [मॉडल को कमजोर मत बनाइए](/hi/column/dont-lobotomize-the-model/)
