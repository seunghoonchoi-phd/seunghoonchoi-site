---
title: "US Tax Navigator for International Students: Fill Out 1040-NR and 8843 in Your Browser"
seoTitle: "International Student Tax App: 1040-NR, Form 8843, and State Tax for F-1/J-1"
date: 2026-07-11
categories: ["Tools"]
tags: ["study abroad", "taxes", "1040-NR", "F-1", "app"]
subtitle: "Answer six steps to calculate your tax and fill official IRS PDFs. What you enter is never sent to a server."
description: "US Tax Navigator is a free web app that calculates the federal 1040-NR, Form 8843, and state tax for F-1/J-1 students in tax year 2026 and fills official IRS PDFs. Everything you enter stays in this browser."
image: /images/us-tax-card.svg
reviewStatus: "done"
hidden: true
build: {list: never, render: always}
---
<div class="appcard">
  <img class="appcard__icon" src="/us-tax/icon.svg" alt="US Tax Navigator app icon">
  <div class="appcard__body">
    <span class="appcard__free">Free web app</span>
    <h3>US Tax Navigator</h3>
    <p>Calculates the 1040-NR, Form 8843, and state tax for F-1/J-1 students in six steps and fills official IRS PDFs. Everything you enter is stored only in this browser and never sent to a server.</p>
    <a class="cta" href="/us-tax/" target="_blank" rel="noopener">Open the app →</a>
  </div>
</div>

International students on an F-1 or J-1 visa file taxes on different forms than citizens. In most cases they must file 1040-NR instead of Form 1040, and Form 8843 is required even with no income. Most consumer tax software does not support 1040-NR. So I built a calculator that handles everything from residency determination to form filling inside the browser.

## Calculate in six steps

The first step is residency. Enter your visa type, year of entry, and days present in each year, and the app first checks whether you are a nonresident alien (NRA) for tax purposes. Then enter your school scholarship (Form 1042-S), dividends, interest, stock gains and losses, deductions, and estimated payments, and the results step shows your federal 1040-NR tax and state tax together. If you choose a state with no income tax, such as Florida, it tells you no state return is needed, and if you choose Missouri, it calculates the MO-1040 tax.

## Tax treaty and brokerage CSV support

If you select Korean citizenship, the app automatically suggests items exempted under the Korea-US tax treaty. For income covered by a treaty article, such as scholarships, it calculates the exempt and taxable amounts separately. For investment income, upload a CSV downloaded from Charles Schwab and the app sorts it into dividends, interest, and trading gains and losses; data from other brokers can be entered through a generic CSV format or by hand.

## The results fill official IRS PDFs

In the last step, enter personal details such as your name and SSN, and the app fills the calculated values into the fields of the official IRS form PDFs for download. It supports 1040-NR with its schedules (1, A, NEC, OI) and Form 8843. Items it cannot decide automatically are left blank, together with a list of what to verify by hand. Because the 2026 revision of the official forms is not yet published, it currently fills the 2025 revision and notes this in the same list.

## Everything you enter stays in this browser

This app is a static web app that runs without a server. Everything you enter, including your name, SSN, and income amounts, is stored only in this browser and never sent to a server. Tax calculation and PDF filling also run entirely in the browser, and uploaded CSV files are read directly by the browser. On a shared computer, clear the browser data when you finish.

## A reference calculator, not tax advice

This app is a reference calculator and does not replace professional tax advice. It targets F-1/J-1 nonresident students in tax year 2026, and for state tax it supports Missouri only, while showing a notice that Florida has no income tax. If you are determined to be a resident, you must file Form 1040, so treat this app's numbers as rough estimates only. Before filing, check the filled values directly on the forms, and consult a tax professional if your situation is complex.
