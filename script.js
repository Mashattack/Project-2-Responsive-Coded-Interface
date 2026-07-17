// Visual style switcher for Character Creation Page
(function(){
	const STYLE_ID = 'visual-style-styles';
	const BTN_ID = 'visual-style-toggle';
	const COMPLETE_BTN_ID = 'complete-button';
	const STORAGE_KEY = 'pageVisualStyle';

	const css = `
	/* Style One: Light / Default */
	.style-one {
		background: linear-gradient(180deg,#ffffff,#f2f2f8);
		color: #111827 !important;
		transition: background 300ms ease, color 300ms ease;
	}
	.style-one a { color: #1f6feb !important; }

	/* Style Two: Dark / Creepy */
	.style-two {
		background: radial-gradient(circle at 10% 10%, #0b0b0b 0%, #050505 40%), linear-gradient(180deg, rgba(0,0,0,0.65), rgba(8,8,8,0.95));
		color: #9fe57f !important;
		transition: background 300ms ease, color 300ms ease, filter 300ms ease;
	}
	.style-two a { color: #b7ffb0 !important; text-shadow: 0 0 6px rgba(183,255,176,0.06); }
	.style-two img, .style-two video { filter: brightness(0.75) contrast(1.05) saturate(0.9); }

	/* Toggle button */
	#${BTN_ID} {
		position: fixed;
		right: 16px;
		bottom: 16px;
		z-index: 9999;
		background: rgba(255,255,255,0.9);
		color: #111;
		border: 1px solid rgba(0,0,0,0.08);
		padding: 8px 12px;
		border-radius: 8px;
		cursor: pointer;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial;
		box-shadow: 0 6px 18px rgba(0,0,0,0.12);
	}
	#${BTN_ID}[data-style="two"] { background: rgba(6,18,8,0.9); color: #cfeecf; border-color: rgba(80,160,80,0.08); }
	/* Complete button: small red button placed near the Name field */
	#${COMPLETE_BTN_ID} {
		display: inline-block;
		margin-left: 8px;
		padding: 8px 12px;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		font-size: 14px;
		font-weight: 700;
		vertical-align: middle;
		transition: transform 120ms ease, box-shadow 120ms ease;
		box-shadow: 0 6px 18px rgba(0,0,0,0.12);
		background: linear-gradient(90deg,#ff5a5a,#ff2b2b);
		color: #fff;
	}
	#${COMPLETE_BTN_ID}[disabled]{
		opacity: 0.6;
		cursor: not-allowed;
		box-shadow: none;
		transform: none;
	}
	#${COMPLETE_BTN_ID}:active { transform: translateY(1px); }
	/* Slightly different red for dark style for better contrast */
	.style-two #${COMPLETE_BTN_ID} { background: linear-gradient(90deg,#8b0000,#ff3333); color: #fff; box-shadow: 0 6px 18px rgba(0,0,0,0.45); }
	`;

	function ensureStyles(){
		if (!document.getElementById(STYLE_ID)){
			const s = document.createElement('style');
			s.id = STYLE_ID;
			s.textContent = css;
			document.head.appendChild(s);
		}
	}

	function createButton(){
		if (document.getElementById(BTN_ID)) return document.getElementById(BTN_ID);
		const btn = document.createElement('button');
		btn.id = BTN_ID;
		btn.type = 'button';
		btn.setAttribute('aria-label','Toggle visual style');
		btn.addEventListener('click', ()=>{
			const current = document.documentElement.classList.contains('style-two') ? 'two' : 'one';
			const next = current === 'one' ? 'two' : 'one';
			applyStyle(next);
			try { localStorage.setItem(STORAGE_KEY, next); } catch(e){}
		});
		document.body.appendChild(btn);
		return btn;
	}

	function findNameField(){
		const simple = document.querySelector('input[name="name"],input#name,input[name*="name"],input[id*="name"],textarea[name*="name"],select[name*="name"]');
		if (simple) return simple;
		const labels = Array.from(document.getElementsByTagName('label'));
		for (const lbl of labels){
			if (/\bname\b/i.test(lbl.textContent || '')){
				const forId = lbl.getAttribute('for');
				if (forId){
					const el = document.getElementById(forId);
					if (el) return el;
				}
				const inside = lbl.querySelector('input,textarea,select');
				if (inside) return inside;
				return lbl;
			}
		}
		return document.querySelector('input,textarea,select');
	}

	function createCompleteButton(){
		if (document.getElementById(COMPLETE_BTN_ID)) return document.getElementById(COMPLETE_BTN_ID);
		const b = document.createElement('button');
		b.id = COMPLETE_BTN_ID;
		b.className = 'button';
		b.type = 'button';
		b.textContent = 'Complete';
		b.setAttribute('aria-label','Complete and go to thank you page');
		b.addEventListener('click', ()=>{
			try{ window.location.href = 'thank-you.html'; }
			catch(e){ window.location.assign('thank-you.html'); }
		});

		// Disable by default until name input has value
		b.disabled = true;

		const anchor = findNameField();
		if (anchor && anchor.parentNode){
			// insert after the anchor element
			anchor.parentNode.insertBefore(b, anchor.nextSibling);
		} else {
			document.body.appendChild(b);
		}

		// Determine all logical sections that contain inputs
		function findSections(){
			const sections = [];
			// fieldsets first
			document.querySelectorAll('fieldset').forEach(f=>sections.push(f));
			// common semantic containers
			document.querySelectorAll('.section, .group, .panel, .step, .form-section').forEach(e=>sections.push(e));
			// direct children of first form that contain inputs
			const form = document.querySelector('form');
			if (form){
				Array.from(form.children).forEach(ch=>{ if (ch.querySelector && ch.querySelector('input,select,textarea')) sections.push(ch); });
			}
			// fallback: use top-level containers that have inputs
			document.querySelectorAll('main, .container, .content').forEach(e=>{ if (e.querySelector && e.querySelector('input,select,textarea')) sections.push(e); });
			// dedupe and return only elements that actually contain inputs
			const uniq = Array.from(new Set(sections)).filter(s=>s && s.querySelector && s.querySelector('input,select,textarea'));
			return uniq.length ? uniq : [document.querySelector('form') || document.body];
		}

		function sectionSatisfied(section){
			const all = Array.from(section.querySelectorAll('input,select,textarea'))
				.filter(i=> i && !i.disabled && i.type !== 'hidden' && !i.hasAttribute('hidden'));
			if (!all.length) return true; // nothing required in this section

			// check radios inside the section (grouped by name within the section)
			const radios = all.filter(i=> i.type === 'radio');
			if (radios.length){
				if (radios.some(r=> r.checked)) return true;
				// if radios exist but none checked -> section not satisfied
				return false;
			}

			// check checkboxes
			const checkboxes = all.filter(i=> i.type === 'checkbox');
			if (checkboxes.length){
				if (checkboxes.some(c=> c.checked)) return true;
				return false;
			}

			// check selects
			const selects = all.filter(i=> i.tagName === 'SELECT');
			if (selects.length){
				if (selects.some(s=> {
					try{ return (s.value || '').toString().trim().length > 0 && s.selectedIndex !== 0; }catch(e){return false}
				})) return true;
				return false;
			}

			// check text-like inputs / textareas
			const texts = all.filter(i=> i.tagName === 'TEXTAREA' || (i.tagName === 'INPUT' && ['text','email','tel','number','search','url','password'].includes(i.type)));
			if (texts.length){
				if (texts.some(t=> (t.value||'').toString().trim().length > 0)) return true;
				return false;
			}

			// fallback: if there are other input types (e.g., date, time), consider non-empty value as selection
			if (all.some(i=> (i.value || '').toString().trim().length > 0)) return true;

			return false;
		}

		const sections = findSections();
		function checkAll(){
			try{
				const allOk = sections.every(s=> sectionSatisfied(s));
				b.disabled = !allOk;
			}catch(e){ b.disabled = false; }
		}
		// attach listeners to all inputs in detected sections
		sections.forEach(s=>{
			Array.from(s.querySelectorAll('input,select,textarea')).forEach(inp=>{
				inp.addEventListener('input', checkAll);
				inp.addEventListener('change', checkAll);
			});
		});
		// initial check
		checkAll();
		return b;
	}

	function applyStyle(key){
		document.documentElement.classList.remove('style-one','style-two');
		if (key === 'two') document.documentElement.classList.add('style-two');
		else document.documentElement.classList.add('style-one');
		const btn = document.getElementById(BTN_ID);
		if (btn) {
			btn.dataset.style = key;
			btn.textContent = key === 'two' ? 'Style: Creepy' : 'Style: Default';
		}
	}

	function init(){
		ensureStyles();
		createButton();
		createCompleteButton();
		let saved = null;
		try { saved = localStorage.getItem(STORAGE_KEY); } catch(e){}
		if (saved === 'two' || saved === 'one') applyStyle(saved);
		else applyStyle('one');
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();

})();

