export async function openSidebar(page) {
 const sidebar=page.locator('#app-sidebar');
 if(!await sidebar.isVisible()) await page.getByRole('button',{name:'Abrir menú lateral',exact:true}).click();
}
export async function navigate(page,name) {
 await openSidebar(page);
 await page.locator('.sidebar-navigation').getByRole('button',{name,exact:true}).click();
}
export async function chooseExercise(page,index,touch=false) {
 await openSidebar(page);
 const picker=page.locator('#exercise-menu');
 if(!await picker.evaluate(node=>node.open)) await picker.locator('summary').click();
 const button=page.locator('.tab').nth(index);
 if(touch) await button.tap(); else await button.click();
}
export async function selectValue(page,target,value) {
 const locator=typeof target==='string'?page.locator(target):target;
 const isNative=await locator.evaluate(node=>node.tagName==='SELECT');
 const id=isNative?await locator.getAttribute('id'):await locator.getAttribute('data-native-select');
 const native=page.locator(`[id="${id}"]`);
 const label=await native.evaluate((node,value)=>[...node.options].find(option=>option.value===value)?.label,value);
 if(label===undefined)throw new Error(`Option ${value} missing from ${id}`);
 const trigger=page.locator(`[data-native-select="${id}"]`);
 await trigger.click();
 await page.locator(`[id="${id}-options"]`).getByRole('option',{name:label,exact:true}).click();
}
