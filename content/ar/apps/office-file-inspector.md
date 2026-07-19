---
title: "Office File Inspector: أداة لفحص عيوب PowerPoint وExcel وWord التي يصنعها الذكاء الاصطناعي"
seoTitle: "Office File Inspector: فحص مفتوح المصدر لملفات PPT وExcel وWord المولدة بالذكاء الاصطناعي"
date: 2026-06-16
categories: ["أدوات"]
tags: ["مفتوح المصدر", "ai", "Office File Inspector"]
subtitle: "يلتقط الأخطاء الواضحة من دون خفض سقف جودة النتيجة"
description: "Office File Inspector أداة مفتوحة المصدر تلتقط العيوب الواضحة في ملفات PowerPoint وExcel وWord التي يصنعها الذكاء الاصطناعي، مثل النص الخارج من الشريحة وأخطاء #REF! وبقايا Markdown."
image: /images/llm-office-qa-card.svg
aliases: ["/apps/llm-office-qa/"]
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="أيقونة Office File Inspector">
  <div class="appcard__body">
    <span class="appcard__free">مفتوح المصدر (MIT)</span>
    <h3>Office File Inspector</h3>
    <p>أداة تلتقط العيوب الواضحة في ملفات PowerPoint وExcel وWord التي يصنعها الذكاء الاصطناعي، وتترك اختيارات الأسلوب كما هي.</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">شاهده على GitHub ←</a>
  </div>
</div>

عندما تطلب من نموذج لغوي أن يصنع عرضًا تقديميًا أو جدولًا أو مستندًا، تظهر أخطاء متشابهة كثيرًا. نص يخرج خارج الشريحة، خطأ `#REF!` في Excel، خلية تبدو رقمًا لكنها محفوظة كنص، أو Markdown بقي داخل مستند Word.

Office File Inspector يلتقط هذه العيوب الواضحة فقط. لا يحول عدد الخطوط، أو عدد النقاط، أو الألوان، أو كثافة المعلومات إلى قواعد فحص، لأن هذه الخيارات تتغير بحسب الهدف والسياق. أداة الفحص يجب أن ترفع الحد الأدنى لجودة النتيجة. لا يجب أن تخفض سقفها.

أول ملف تستخدمه هو `check_office_file.py`. يمكن فحص PowerPoint وExcel وWord بالأمر نفسه.

```bash
python check_office_file.py report.pptx
python check_office_file.py model.xlsx
python check_office_file.py proposal.docx
```

إذا أردت فحص كل نوع ملف مباشرة، يمكنك استخدام `tools/check_powerpoint.py` و`tools/check_excel.py` و`tools/check_word.py`. وإذا أردت أن يفحص الوكيل ملفات Office فور إنشائها، يمكنك توصيل `integrations/auto_check_office_files.py` كـ hook.

أبقيت عنوان مستودع GitHub باسم `llm-office-qa` حتى تبقى الروابط القديمة صالحة. لكن الاسم العام وREADME وبنية ملفات التشغيل أصبحت منظمة حول Office File Inspector.

[شاهده على GitHub ←](https://github.com/seunghoonchoi-phd/llm-office-qa)

لماذا بنيته بهذه الطريقة، ولماذا لا ينبغي لطبقة الفحص أن تخفض سقف الجودة أثناء المراجعة ← [لا تخفض سقف الجودة أثناء المراجعة](/ar/column/dont-lobotomize-the-model/)
