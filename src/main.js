import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

document.addEventListener("DOMContentLoaded", () => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 750); });
    gsap.ticker.lagSmoothing(0);

    function splitTextIntoSpans(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            const [firstDigit, secondDigit] = element.innerText;
            element.innerHTML = `
                <div class="digit-wrapper">
                    <span class="first">${firstDigit}</span>
                    <span class="second">${secondDigit}</span>
                </div>`;
        });
    }

    function populateGallery() {
        const imageContainers = document.querySelectorAll(".images");
        let imageIndex = 1;
        imageContainers.forEach(container => {
            for (let j = 0; j < imagesPerProject; j++) {
                if (imageIndex > totalImages) imageIndex = 1;

                const imgContainer = document.createElement("div");
                imgContainer.classList.add("img");

                const img = document.createElement("img");
                img.src = `/assets/img${imageIndex}.jpg`;
                img.alt = `Project image ${imageIndex}`;

                imgContainer.appendChild(img);
                container.appendChild(imgContainer);
                imageIndex++;
            }
        });
    }

    const imagesPerProject = 6;
    const totalImages = 50;

    const imageNames = [
        // Progetto 01 - Infanzia
        ["Art Attack", "GUMBALL", "Diario di un Wedding Planner", "Minecraft", "Spongebob", "Crash bandicoot"],
        // Progetto 02 - Adolescenza
        ["Musica classica (André Rieu)", "DANCE", "Mario Kart", "Animal Crossing", "Pianoforte", "Il fu mattia pascal"],
        // Progetto 03 - Adesso
        ["Emily in Paris", "High Potential", "Bridgerton", "Halo: Infinity", "Graphic design", "Programmazione"]
    ];

    splitTextIntoSpans(".mask h1");
    populateGallery();
    ScrollTrigger.refresh();

    // --- Progress bar ---
    ScrollTrigger.create({
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
            gsap.set(".progress-bar", { scaleY: self.progress });
        }
    });

    const previewImg = document.querySelector(".preview-img img");
    const indicator = document.querySelector(".indicator");
    const indicatorStep = 18;
    gsap.set(indicator, { top: "0px" });

    const names = gsap.utils.toArray(".name");
    const projects = gsap.utils.toArray(".project");
    const imgElements = document.querySelectorAll(".img img");

    const firstNames = imageNames[0] || [];
    names.forEach((name, i) => {
        name.querySelector("p").textContent = firstNames[i] || "";
        name.classList.toggle("active", i === 0);
    });

    // Dichiarate prima del loop per essere visibili a updateUI
    let isSnapping = false;
    let currentImgIndex = 0;
    let isKeyScrolling = false;

    imgElements.forEach((img, globalIndex) => {
        const positionInProject = globalIndex % imagesPerProject;
        const projectIndex = Math.floor(globalIndex / imagesPerProject);
        const isLastInProject = positionInProject === imagesPerProject - 1;
        const nextProject = projects[projectIndex + 1] || null;

        function updateUI(idx) {
            if (!isKeyScrolling) currentImgIndex = idx;

            previewImg.src = img.src;

            gsap.to(indicator, {
                top: positionInProject * indicatorStep + "px",
                duration: 0.3,
                ease: "power2.out"
            });

            const currentNames = imageNames[projectIndex] || [];
            names.forEach((name, i) => {
                name.querySelector("p").textContent = currentNames[i] || "";
                name.classList.toggle("active", i === positionInProject);
            });
        }

        ScrollTrigger.create({
            trigger: img,
            start: "top 50%",
            end: "bottom 50%",
            onEnter: () => { updateUI(globalIndex); },
            onEnterBack: () => { updateUI(globalIndex); },

            onLeave: () => {
                if (isLastInProject && nextProject && !isSnapping) {
                    isSnapping = true;

                    const nextProjectImages = nextProject.querySelectorAll(".img img");
                    const firstImageNextProject = nextProjectImages[0];

                    lenis.scrollTo(nextProject, {
                        offset: -(window.innerHeight * 0.48),
                        duration: 0.5,
                        easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
                        onComplete: () => {
                            if (firstImageNextProject) {
                                previewImg.src = firstImageNextProject.src;

                                gsap.to(indicator, { top: "0px", duration: 0.3, ease: "power2.out" });
                                names.forEach((name, i) => { name.classList.toggle("active", i === 0); });
                            }

                            lenis.stop();
                            setTimeout(() => {
                                lenis.start();
                                setTimeout(() => { isSnapping = false; }, 100);
                            }, 600);
                        }
                    });
                }
            }
        });
    });

    // === Digit animation ===
    let scrollVelocity = 0;
    let lastScrollTop = 0;
    let activeIndex = -1;

    projects.forEach((project, i) => {
        const mask = project.querySelector(".mask");
        const digitWrapper = project.querySelector(".digit-wrapper");
        const firstDigit = digitWrapper.querySelector(".first");
        const secondDigit = digitWrapper.querySelector(".second");
        const projectTitle = project.querySelector(".project-title");

        gsap.set([mask, digitWrapper, firstDigit, secondDigit, projectTitle], { y: 0 });
        gsap.set(mask, { position: "absolute", top: 0 });

        ScrollTrigger.create({
            trigger: project,
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
                const projectRect = project.getBoundingClientRect();
                const windowCenter = window.innerHeight / 2;
                const nextProject = projects[i + 1];
                const velocityAdjustment = Math.min(scrollVelocity * 0.1, 100);
                const pushPoint = window.innerHeight * (0.85 + velocityAdjustment / window.innerHeight);

                if (projectRect.top < windowCenter) {
                    if (!mask.isfixed) {
                        mask.isfixed = true;
                        gsap.set(mask, { position: "fixed", top: "50vh" });
                    }

                    if (nextProject) {
                        const nextRect = nextProject.getBoundingClientRect();
                        if (nextRect.top <= pushPoint && activeIndex !== i + 1) {
                            gsap.killTweensOf([mask, digitWrapper, firstDigit, secondDigit, projectTitle]);
                            activeIndex = i + 1;

                            gsap.to(mask, { y: -90, duration: 0.3, ease: "power2.out", overwrite: true });
                            gsap.to(digitWrapper, { y: -90, duration: 0.5, delay: 0.5, ease: "power2.out", overwrite: true });
                            gsap.to(firstDigit, { y: -90, duration: 0.75, ease: "power2.out", overwrite: true });
                            gsap.to(secondDigit, { y: -90, duration: 0.75, delay: 0.1, ease: "power2.out", overwrite: true });
                            gsap.to(projectTitle, { y: -90, duration: 0.4, delay: 0.15, ease: "power2.out", overwrite: true });
                        }
                    }
                } else {
                    mask.isfixed = false;
                    gsap.set(mask, { position: "absolute", top: 0 });
                }

                if (self.direction === -1 && projectRect.top > windowCenter) {
                    mask.isfixed = false;
                    gsap.set(mask, { position: "absolute", top: 0 });

                    if (i > 0 && activeIndex === i) {
                        const prevProject = projects[i - 1];
                        if (prevProject) {
                            const prevMask = prevProject.querySelector(".mask");
                            const prevWrapper = prevProject.querySelector(".digit-wrapper");
                            const prevFirst = prevWrapper.querySelector(".first");
                            const prevSecond = prevWrapper.querySelector(".second");
                            const prevTitle = prevProject.querySelector(".project-title");
                            
                            gsap.killTweensOf([prevMask, prevWrapper, prevFirst, prevSecond, prevTitle]);

                            activeIndex = i - 1;
                            gsap.to([prevMask, prevWrapper], { y: 0, duration: 0.3, ease: "power2.out", overwrite: true });
                            gsap.to(prevFirst, { y: 0, duration: 0.75, ease: "power2.out", overwrite: true });
                            gsap.to(prevSecond, { y: 0, duration: 0.75, delay: 0.1, ease: "power2.out", overwrite: true });
                            gsap.to(prevTitle, { y: 0, duration: 0.4, delay: 0.15, ease: "power2.out", overwrite: true });
                        }
                    }
                }
            },

            onEnter: () => { if (i === 0) activeIndex = 0; }
        });
    });

    window.addEventListener("scroll", () => {
        const st = window.pageYOffset;
        scrollVelocity = Math.abs(st - lastScrollTop);
        lastScrollTop = st;
    }, { passive: true });

    // === Navigazione con frecce ===
    const allImgs = Array.from(document.querySelectorAll(".img img"));
    let currentImageIndex = -1; // ← -1 così il primo press va all'immagine 0

    function scrollToImage(index) {
        if (index < 0 || index >= allImgs.length || isKeyScrolling || isExpanded) return;

        isKeyScrolling = true;
        currentImageIndex = index;

        const safetyTimeout = setTimeout(() => { isKeyScrolling = false; }, 800); // massimo atteso

        const targetImg = allImgs[index];
        const positionInProject = index % imagesPerProject;
        const isProjectChange = positionInProject === 0 && index !== 0;

        lenis.start();

        lenis.scrollTo(targetImg, {
            offset: -(window.innerHeight / 2) + (targetImg.offsetHeight / 2),
            duration: isProjectChange ? 0.4 : 0.22,
            easing: isProjectChange
                ? (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
                : (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

            onComplete: () => {
                clearTimeout(safetyTimeout);
                previewImg.src = targetImg.src;

                gsap.to(indicator, {
                    top: positionInProject * indicatorStep + "px",
                    duration: 0.3,
                    ease: "power2.out"
                });
                names.forEach((name, i) => {
                    name.classList.toggle("active", i === positionInProject);
                });

                // Pausa più lunga se cambia progetto, senza usare lenis.stop()
                // che bloccherebbe i successivi scrollToImage
                const pause = isProjectChange ? 200 : 60;
                setTimeout(() => { isKeyScrolling = false; }, pause);
            }
        });
    }

    function getCurrentImageIndex() {
        const center = window.innerHeight / 2;
        let closest = 0;
        let closestDist = Infinity;
        allImgs.forEach((img, i) => {
            const rect = img.getBoundingClientRect();
            const dist = Math.abs((rect.top + rect.height / 2) - center);
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        });
        return closest;
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            e.preventDefault();
            if (!isKeyScrolling) currentImgIndex = getCurrentImageIndex(); // ← risincronizza
            scrollToImage(currentImgIndex + 1);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            e.preventDefault();
            if (!isKeyScrolling) currentImgIndex = getCurrentImageIndex(); // ← risincronizza
            scrollToImage(currentImgIndex - 1);
        }
    });


    // === Preview hover ===
    const previewImgContainer = document.querySelector(".preview-img");
    const overlay = document.querySelector(".overlay");
    let isExpanded = false;

    // Converte la posizione originale in top/left in pixel
    // così GSAP usa sempre le stesse proprietà in entrambe le direzioni
    function getOriginalPosition() {
        const rect = previewImgContainer.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        };
    }

    let originalPos = null;

    function expandPreview() {
        if (isExpanded) return;
        isExpanded = true;
        lenis.stop();

        // Salva la posizione originale al momento del click
        originalPos = getOriginalPosition();

        // Prima porta la preview in top/left fisso (stesso punto visivo)
        gsap.set(previewImgContainer, {
            position: "fixed",
            top: originalPos.top,
            left: originalPos.left,
            bottom: "auto",
            right: "auto",
            width: originalPos.width,
            height: originalPos.height,
            xPercent: 0,
            yPercent: 0,
            scale: 1
        });

        overlay.classList.add("active");
        previewImgContainer.classList.add("expanded");

        const scaleX = (window.innerWidth * 0.7) / originalPos.width;
        const scaleY = (window.innerHeight * 0.8) / originalPos.height;
        const scale = Math.min(scaleX, scaleY);

        // Poi anima verso il centro
        gsap.to(previewImgContainer, {
            top: "50%",
            left: "50%",
            xPercent: -50,
            yPercent: -50,
            scale: scale,
            duration: 0.7,
            ease: "power3.inOut"
        });
    }

    function collapsePreview() {
        if (!isExpanded || !originalPos) return;
        isExpanded = false;
        lenis.start();
        overlay.classList.remove("active");
        previewImgContainer.classList.remove("expanded");

        // Anima dal centro verso la posizione originale salvata
        gsap.to(previewImgContainer, {
            top: originalPos.top,
            left: originalPos.left,
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            duration: 0.7,
            ease: "power3.inOut",
            onComplete: () => {
                // Ripristina il posizionamento originale bottom/right
                gsap.set(previewImgContainer, {
                    top: "auto",
                    left: "auto",
                    bottom: "2em",
                    right: "2em",
                    scale: 1,
                    width: "",
                    height: ""
                });
            }
        });
    }

    previewImgContainer.addEventListener("click", () => {
        isExpanded ? collapsePreview() : expandPreview();
    });

    overlay.addEventListener("click", collapsePreview);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isExpanded) collapsePreview();
    });
});