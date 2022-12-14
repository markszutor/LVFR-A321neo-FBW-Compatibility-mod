'use strict';

/* global Airliners */

class A32NX_hyd_page_Logic extends Airliners.EICASTemplateElement {
    constructor() {
        super();
        let lastTime = this._lastTime;
        this.getDeltaTime = () => {
            const nowTime = Date.now();
            const deltaTime = nowTime - lastTime;
            lastTime = nowTime;

            return deltaTime;
        };
    }

    get templateID() {
        return 'A32NX_hyd_page_TEMPLATE';
    }

    connectedCallback() {
        super.connectedCallback();

        // This is big hack, see `template.html`.
        {
            const code = document.getElementById('A32NX_hyd_page_BUNDLED_STYLE').innerHTML;
            const style = document.createElement('style');
            style.innerHTML = code;
            document.head.appendChild(style);
        }
        {
            const code = document.getElementById('A32NX_hyd_page_BUNDLED_LOGIC').innerHTML;
            const script = document.createElement('script');
            script.innerHTML = code;
            document.body.appendChild(script);
        }
    }

    onEvent(_event) {
    }

    update(_deltaTime) {
        this.dispatchEvent(new CustomEvent('update', { detail: this.getDeltaTime() }));
    }
}

customElements.define('a32nx-hyd-page-element', A32NX_hyd_page_Logic);
