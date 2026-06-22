---
title: "AI से बने PPT, Excel, Word की गलतियाँ जाँचने वाला ओपन सोर्स — llm-office-qa"
seoTitle: "AI से बने PPT, Excel, Word की गलतियाँ जाँचने वाला ओपन सोर्स लिंटर"
date: 2026-06-16
categories: ["टूल"]
tags: ["ओपन सोर्स", "ai"]
subtitle: "ज़्यादा होशियार मॉडल को नहीं रोकता, सिर्फ़ साफ़ दिखने वाली गलतियाँ पकड़ता है"
description: "AI से बने PPT, Excel, Word में टेक्स्ट का बाहर निकलना, #REF! एरर, बचा हुआ मार्कडाउन जैसी साफ़ गलतियाँ ही पकड़ने वाला ओपन सोर्स पायथन लिंटर। नतीजा हमेशा एक जैसा, MIT लाइसेंस, Claude Code हुक।"
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="llm-office-qa आइकन">
  <div class="appcard__body">
    <span class="appcard__free">ओपन सोर्स (MIT)</span>
    <h3>llm-office-qa</h3>
    <p>AI से बने PowerPoint, Excel, Word की सिर्फ़ साफ़ दिखने वाली गलतियाँ पकड़ता है, और स्टाइल को जान-बूझकर नहीं छूता। नतीजा हमेशा एक जैसा रहता है।</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">GitHub पर देखें →</a>
  </div>
</div>

LLM को स्लाइड या स्प्रेडशीट बनाने को कहें तो हमेशा एक जैसी गलतियाँ निकलती हैं। स्लाइड से बाहर निकल गया टेक्स्ट, `#REF!` एरर, ऐसा खाना जिसमें संख्या है पर वह टेक्स्ट के रूप में सेव हुई है, और Word में बिना मिटे रह गया मार्कडाउन। **llm-office-qa** बस इन्हीं को पकड़ता है। बाकी किसी चीज़ को नहीं छूता।

- **सिर्फ़ साफ़ दिखने वाली गलतियाँ** — कैनवस से बाहर निकला टेक्स्ट, टूटा हुआ फ़ॉर्मूला, गलत खानों की संख्या वाली टेबल, बिगड़े अनुपात वाली तस्वीर, सिर्फ़ कुछ हिस्से में बची बॉर्डर, और न मिटा हुआ मार्कडाउन
- **स्टाइल को मॉडल पर छोड़ देता है** — घनापन हो, रंग हो, फ़ॉन्ट हो या वाक्य हो, यह तय करना मॉडल का काम है, लिंटर का नहीं
- **नतीजा हमेशा एक जैसा** — यह फ़ाइल पढ़कर सिर्फ़ नापता है। न कोई नेटवर्क, न कोई मॉडल कॉल
- **MIT लाइसेंस**, और [Claude Code](https://docs.claude.com/en/docs/claude-code) हुक से चलता है — फ़ाइल भेजने से पहले गलतियाँ वापस मॉडल को बताकर उससे ख़ुद ठीक करवाता है

[GitHub पर देखें →](https://github.com/seunghoonchoi-phd/llm-office-qa)

इसे ऐसा क्यों बनाया — QA की यह परत ज़्यादा होशियार मॉडल की बेड़ी क्यों नहीं बननी चाहिए → [मॉडल को कुंद मत बनाओ](/hi/column/dont-lobotomize-the-model/)
