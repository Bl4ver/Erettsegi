# 🧮 Tipikus Érettségi Példafeladatok és Megoldások

Ezek a feladatok a középszintű érettségi leggyakoribb típusait fedik le. Ha ezeket a logikákat megérted, biztos a pontszerzés!

---

### 1. Másodfokú egyenlet megoldása
**Feladat:** Oldd meg a valós számok halmazán a következő egyenletet: $2x^2 - 5x - 3 = 0$

**Levezetés lépésről lépésre:**
1. Olvassuk le az együtthatókat: $a = 2$, $b = -5$, $c = -3$.
2. Írjuk fel a megoldóképletet: 
   $x_{1,2} = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$
3. Helyettesítsük be az értékeket:
   $x_{1,2} = \frac{-(-5) \pm \sqrt{(-5)^2 - 4 \cdot 2 \cdot (-3)}}{2 \cdot 2}$
4. Végezzük el a gyök alatti műveleteket (előjelekre vigyázni!):
   $x_{1,2} = \frac{5 \pm \sqrt{25 - (-24)}}{4} = \frac{5 \pm \sqrt{49}}{4}$
5. Vonjunk gyököt: $\sqrt{49} = 7$.
6. Számoljuk ki a két gyököt:
   * $x_1 = \frac{5 + 7}{4} = \frac{12}{4} = 3$
   * $x_2 = \frac{5 - 7}{4} = \frac{-2}{4} = -0.5$

**Megoldás:** Az egyenlet gyökei: $x_1 = 3$ és $x_2 = -0.5$.

---

### 2. Számtani sorozat
**Feladat:** Egy számtani sorozat első tagja $a_1 = 5$, differenciája $d = 3$. Mennyi a sorozat 20. tagja, és mennyi az első 20 tag összege?

**Levezetés:**
1. A 20. tag kiszámítása a képlettel: $a_n = a_1 + (n-1)d$
   $a_{20} = 5 + (20-1) \cdot 3 = 5 + 19 \cdot 3 = 5 + 57 = 62$
2. Az összeg kiszámítása a képlettel: $S_n = \frac{a_1 + a_n}{2} \cdot n$
   $S_{20} = \frac{5 + 62}{2} \cdot 20 = \frac{67}{2} \cdot 20 = 67 \cdot 10 = 670$

**Megoldás:** A sorozat 20. tagja **62**, az első húsz tag összege **670**.

---

### 3. Klasszikus valószínűségszámítás
**Feladat:** Egy osztályban 12 fiú és 18 lány van. Véletlenszerűen kiválasztunk két tanulót felelni. Mennyi a valószínűsége, hogy mindkét felelő lány lesz?

**Levezetés:**
1. A klasszikus valószínűségi modellt használjuk: $P = \frac{\text{kedvező esetek}}{\text{összes eset}}$
2. **Összes eset:** Hányféleképpen választhatunk ki 2 embert a 30-ból? Ez egy kombináció (sorrend nem számít):
   Összes = $\binom{30}{2} = \frac{30 \cdot 29}{2} = 435$
3. **Kedvező eset:** Hányféleképpen választhatunk ki 2 lányt a 18-ból?
   Kedvező = $\binom{18}{2} = \frac{18 \cdot 17}{2} = 153$
4. **Valószínűség kiszámítása:**
   $P = \frac{153}{435}$
5. Egyszerűsítve (3-mal): $P = \frac{51}{145}$ (tizedestörtben kb. **0.351**, azaz **35.1%**).

**Megoldás:** A valószínűség $\frac{51}{145}$ vagyis kb. **35.1%**.

---

### 4. Koordináta-geometria (Kör egyenlete)
**Feladat:** Írja fel annak a körnek az egyenletét, amelynek középpontja $K(2, -3)$ és átmegy a $P(5, 1)$ ponton!

**Levezetés:**
1. A kör egyenletének alakja: $(x-u)^2 + (y-v)^2 = r^2$. Ahol $u = 2$ és $v = -3$.
2. A sugarat ($r$) még nem ismerjük. A sugár a $K$ és $P$ pontok távolsága.
3. Távolságképlet alkalmazása:
   $r = \sqrt{(5 - 2)^2 + (1 - (-3))^2}$
   $r = \sqrt{3^2 + 4^2} = \sqrt{9 + 16} = \sqrt{25} = 5$
4. Tehát $r = 5$, így $r^2 = 25$.
5. Írjuk fel az egyenletet a kapott adatokkal:
   $(x - 2)^2 + (y - (-3))^2 = 25$

**Megoldás:** A kör egyenlete: $(x - 2)^2 + (y + 3)^2 = 25$.