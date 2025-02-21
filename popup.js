;(() => {
    async function getActiveTabURL() {
        try {
            const tabs = await chrome.tabs.query({
                currentWindow: true,
                active: true,
            })
            return tabs[0]
        } catch (err) {
            console.error('Error occured in getActiveTabURL', err)
        }
    }

    try {
        const session = 'session'
        const local = 'local'

        const getLocalStorageBtn = document.querySelector('#getLS')
        const setLocalStorageBtn = document.querySelector('#setLS')
        const clearLocalStorageBtn = document.querySelector('#clearLS')
        const feedBackForLocalStorage = document.querySelector('#feedbackLS')

        const getSessionStorageBtn = document.querySelector('#getSS')
        const setSessionStorageBtn = document.querySelector('#setSS')
        const clearSessionStorageBtn = document.querySelector('#clearSS')
        const feedBackForSessionStorage = document.querySelector('#feedbackSS')

        const copyAllBtn = document.querySelector('#copyAll')
        const pasteAllBtn = document.querySelector('#pasteAll')
        const feedbackAll = document.querySelector('#feedbackAll')

        const footerInfo = document.querySelector('.footerInfo')

        /*
        <-----------Util Functions Start------------------------------------------------------>
        */

        // Get all the storage values from the domain to store it in extension's LS
        function getDomainStorageData(typeOfStorage = 'local') {
            try {
                const selectedStorage =
                    typeOfStorage === 'local' ? localStorage : sessionStorage
                const values = []
                if (selectedStorage) {
                    for (let i = 0; i < selectedStorage?.length; i++) {
                        const key = selectedStorage.key(i)
                        const selectedStorageObject = {
                            [key]: selectedStorage.getItem(key),
                        }
                        values.push(selectedStorageObject)
                    }
                }
                console.log(
                    'getDomainStorageData-typeOfStorage-values',
                    typeOfStorage,
                    values?.length || 0
                )
                return values
            } catch (err) {
                console.error(
                    'Error occured in getDomainStorageData',
                    typeOfStorage,
                    err
                )
            }
        }

        // Set all the storage values from the extension's LS to the domain's storage
        function setDomainStorageData(typeOfStorage = 'local') {
            try {
                const selectedStorage =
                    typeOfStorage === 'local' ? localStorage : sessionStorage
                if (selectedStorage) {
                    chrome.storage.local.get(typeOfStorage, function (items) {
                        if (items[typeOfStorage]) {
                            for (const storage of items[typeOfStorage]) {
                                const objKey = Object.keys(storage)
                                selectedStorage.setItem(
                                    objKey[0],
                                    storage[objKey]
                                )
                            }
                        }
                    })
                }
            } catch (err) {
                console.error(
                    'Error occured in setDomainStorageData',
                    typeOfStorage,
                    err
                )
            }
        }

        function clearDomainStorageData(typeOfStorage = 'local') {
            const selectedStorage =
                typeOfStorage === 'local' ? localStorage : sessionStorage
            selectedStorage && selectedStorage?.clear()
        }

        function clearExtensionStorage(typeOfStorage = 'local') {
            chrome.storage.local.remove([typeOfStorage], function () {
                const error = chrome.runtime.lastError
                if (error) {
                    console.error(error)
                }
                console.log(
                    'Cleared Existing Chrome Extension Storage!!',
                    typeOfStorage
                )
            })
        }

        async function getDomainCookies(tab) {
            try {
                const cookies = await chrome.cookies.getAll({ url: tab.url });
                return cookies;
            } catch (err) {
                console.error('Error getting cookies:', err);
                return [];
            }
        }

        async function setDomainCookies(tab, cookies) {
            try {
                for (const cookie of cookies) {
                    // 移除不必要的属性
                    delete cookie.hostOnly;
                    delete cookie.session;
                    
                    // 确保 url 属性正确
                    const url = new URL(tab.url);
                    cookie.url = url.protocol + '//' + url.hostname + url.pathname;
                    
                    await chrome.cookies.set(cookie);
                }
            } catch (err) {
                console.error('Error setting cookies:', err);
            }
        }

        async function getAllStorageData() {
            try {
                // 获取 localStorage 数据
                const localStorage = {};
                for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    localStorage[key] = window.localStorage.getItem(key);
                }

                // 获取 sessionStorage 数据
                const sessionStorage = {};
                for (let i = 0; i < window.sessionStorage.length; i++) {
                    const key = window.sessionStorage.key(i);
                    sessionStorage[key] = window.sessionStorage.getItem(key);
                }

                return {
                    localStorage,
                    sessionStorage
                };
            } catch (err) {
                console.error('Error in getAllStorageData:', err);
                return null;
            }
        }

        async function getAllCookies(tab) {
            return new Promise((resolve) => {
                chrome.cookies.getAll({ url: tab.url }, (cookies) => {
                    resolve(cookies || []);
                });
            });
        }

        async function setAllStorageData(data) {
            try {
                // 设置 localStorage
                if (data.localStorage) {
                    Object.keys(data.localStorage).forEach(key => {
                        window.localStorage.setItem(key, data.localStorage[key]);
                    });
                }

                // 设置 sessionStorage
                if (data.sessionStorage) {
                    Object.keys(data.sessionStorage).forEach(key => {
                        window.sessionStorage.setItem(key, data.sessionStorage[key]);
                    });
                }

                return true;
            } catch (err) {
                console.error('Error in setAllStorageData:', err);
                return false;
            }
        }

        async function setAllCookies(tab, cookies) {
            try {
                for (const cookie of cookies) {
                    const newCookie = {
                        url: tab.url,
                        name: cookie.name,
                        value: cookie.value,
                        path: cookie.path,
                        secure: cookie.secure,
                        httpOnly: cookie.httpOnly,
                        sameSite: cookie.sameSite,
                        expirationDate: cookie.expirationDate
                    };
                    
                    await chrome.cookies.set(newCookie);
                }
                return true;
            } catch (err) {
                console.error('Error in setAllCookies:', err);
                return false;
            }
        }

        function changeFooterTabStyles(target) {
            let infoTitle = document.querySelector('#infoTitle')
            let supportTitle = document.querySelector('#supportTitle')
            let reportTitle = document.querySelector('#reportTitle')
            const allTabs = [infoTitle, supportTitle, reportTitle]
            allTabs.forEach((tab) => {
                if (tab?.id === target) {
                    tab.style.borderBottom = '3px solid black'
                    tab.style.fontWeight = 'bold'
                } else {
                    tab.style.borderBottom = '0px'
                    tab.style.fontWeight = 'normal'
                }
            })
        }

        function showHideFooterTabs(target) {
            let moreinfoContent = document.querySelector('.moreinfoContent')
            let supportContent = document.querySelector('.supportContent')
            let reportContent = document.querySelector('.reportContent')
            const allTabsContent = [
                moreinfoContent,
                supportContent,
                reportContent,
            ]
            allTabsContent.forEach((tab) => {
                console.log(tab.className, 'className')
                if (tab?.className === target) {
                    tab.style.display = 'block'
                } else {
                    tab.style.display = 'none'
                }
            })
        }

        /*
        <-----------Util Functions End------------------------------------------------------>
        */

        /*
        <-----------Event Listeners Start------------------------------------------------------>
        */
        getLocalStorageBtn?.addEventListener('click', async () => {
            const activeTab = await getActiveTabURL()
            const tabId = activeTab?.id
            await clearExtensionStorage(local)
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId },
                    func: getDomainStorageData,
                    args: [local], // passing typeOfStorage to getDomainStorageData func
                },
                (injectionResults) => {
                    try {
                        console.log(
                            'injectionResults of getLocalStorageBtn.addEventListener',
                            injectionResults[0]?.result?.length ?? 0
                        )
                        for (const frameResult of injectionResults) {
                            const result = frameResult?.result || []
                            chrome.storage.local.set({
                                local: result,
                            })
                            feedBackForLocalStorage.innerHTML =
                                'All the local storage values are retrieved. ✔️'
                        }
                    } catch (err) {
                        console.error(
                            'Error occured in injectionResults of getLocalStorageBtn.addEventListener',
                            err
                        )
                    }
                }
            )
        })

        getSessionStorageBtn?.addEventListener('click', async () => {
            const activeTab = await getActiveTabURL()
            const tabId = activeTab?.id
            await clearExtensionStorage(session)
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId },
                    func: getDomainStorageData,
                    args: [session], // passing typeOfStorage to getDomainStorageData func
                },
                (injectionResults) => {
                    try {
                        console.log(
                            'injectionResults of getSessionStorageBtn.addEventListener',
                            injectionResults[0]?.result?.length ?? 0
                        )
                        for (const frameResult of injectionResults) {
                            const result = frameResult?.result || []
                            chrome.storage.local.set({
                                session: result,
                            })
                            feedBackForSessionStorage.innerHTML =
                                'All the session storage values are retrieved. ✔️'
                        }
                    } catch (err) {
                        console.error(
                            'Error occured in injectionResults of getSessionStorageBtn.addEventListener',
                            err
                        )
                    }
                }
            )
        })

        setLocalStorageBtn?.addEventListener('click', async () => {
            const activeTab = await getActiveTabURL()
            console.log('This tab information', activeTab)
            const tabId = activeTab?.id
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId },
                    func: setDomainStorageData,
                    args: [local], // passing typeOfStorage to setDomainStorageData func
                },
                () => {
                    try {
                        console.log('Setting LocalStorage successfull')
                        feedBackForLocalStorage.innerHTML =
                            'All the retrieved local storage values are set. ✔️'
                    } catch (err) {
                        console.error(
                            'Error occured in injectionResults of setStoragehandler',
                            err
                        )
                    }
                }
            )
        })

        setSessionStorageBtn?.addEventListener('click', async () => {
            const activeTab = await getActiveTabURL()
            console.log('This tab information', activeTab)
            const tabId = activeTab?.id
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId },
                    func: setDomainStorageData,
                    args: [session], // passing typeOfStorage to setDomainStorageData func
                },
                () => {
                    try {
                        console.log('Setting SessionStorage Successfull')
                        feedBackForSessionStorage.innerHTML =
                            'All the retrieved session storage values are set. ✔️'
                    } catch (err) {
                        console.error(
                            'Error occured in injectionResults of setStoragehandler',
                            err
                        )
                    }
                }
            )
        })

        clearLocalStorageBtn?.addEventListener('click', async () => {
            const activeTab = await getActiveTabURL()
            console.log('This tab information', activeTab)
            const tabId = activeTab?.id
            const tabURL = activeTab?.url || ''
            let domain
            if (tabURL) {
                domain = new URL(tabURL)
            }
            const text = `You're about to clear all the local storage values of ${
                domain?.hostname || 'this domain'
            }. Click OK to confirm or Cancel to go back`
            if (confirm(text) == true) {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabId },
                        func: clearDomainStorageData,
                        args: [local], // passing typeOfStorage to clearDomainStorageData func
                    },
                    () => {
                        try {
                            console.log(
                                'Clearing Local Storage Values Successfull'
                            )
                            feedBackForLocalStorage.innerHTML =
                                'All the local storage values are cleared. ✔️'
                        } catch (err) {
                            console.error(
                                'Error occured in injectionResults of clearLocalStorageBtn',
                                err
                            )
                        }
                    }
                )
            } else {
            }
        })

        clearSessionStorageBtn?.addEventListener('click', async () => {
            const activeTab = await getActiveTabURL()
            console.log('This tab information', activeTab)
            const tabId = activeTab?.id
            const tabURL = activeTab?.url || ''
            let domain
            if (tabURL) {
                domain = new URL(tabURL)
            }
            const text = `You're about to clear all the session storage values of ${
                domain?.hostname || 'this domain'
            }. Click OK to confirm or Cancel to go back`
            if (confirm(text) == true) {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabId },
                        func: clearDomainStorageData,
                        args: [session], // passing typeOfStorage to clearDomainStorageData func
                    },
                    () => {
                        try {
                            console.log(
                                'Clearing Session Storage Values Successfull'
                            )
                            feedBackForSessionStorage.innerHTML =
                                'All the session storage values are cleared. ✔️'
                        } catch (err) {
                            console.error(
                                'Error occured in injectionResults of clearSessionStorageBtn',
                                err
                            )
                        }
                    }
                )
            }
        })

        copyAllBtn?.addEventListener('click', async () => {
            try {
                const activeTab = await getActiveTabURL();
                console.log('当前标签页信息:', activeTab);
                const tabId = activeTab?.id;

                // 获取存储数据
                chrome.scripting.executeScript(
                    {
                        target: { tabId },
                        func: getAllStorageData
                    },
                    async (storageResults) => {
                        if (chrome.runtime.lastError) {
                            console.error('执行脚本错误:', chrome.runtime.lastError);
                            feedbackAll.textContent = '复制失败: ' + chrome.runtime.lastError.message;
                            return;
                        }

                        // 获取 cookies
                        const cookies = await getAllCookies(activeTab);
                        
                        if (storageResults && storageResults[0]?.result) {
                            const allData = {
                                ...storageResults[0].result,
                                cookies
                            };
                            
                            console.log('复制的数据:', allData);
                            
                            await chrome.storage.local.set({ allStorageData: allData });
                            feedbackAll.textContent = '所有存储数据已复制！';
                        } else {
                            console.error('没有获取到存储数据');
                            feedbackAll.textContent = '复制失败，未能获取存储数据';
                        }
                        
                        setTimeout(() => {
                            feedbackAll.textContent = '';
                        }, 2000);
                    }
                );
            } catch (err) {
                console.error('复制过程出错:', err);
                feedbackAll.textContent = '复制失败: ' + err.message;
                setTimeout(() => {
                    feedbackAll.textContent = '';
                }, 2000);
            }
        });

        pasteAllBtn?.addEventListener('click', async () => {
            try {
                const activeTab = await getActiveTabURL();
                const tabId = activeTab?.id;

                chrome.storage.local.get(['allStorageData'], async (result) => {
                    console.log('读取到的存储数据:', result.allStorageData);
                    
                    if (result.allStorageData) {
                        // 设置存储数据
                        chrome.scripting.executeScript(
                            {
                                target: { tabId },
                                func: setAllStorageData,
                                args: [result.allStorageData]
                            },
                            async (storageResults) => {
                                if (chrome.runtime.lastError) {
                                    console.error('执行脚本错误:', chrome.runtime.lastError);
                                    feedbackAll.textContent = '粘贴失败: ' + chrome.runtime.lastError.message;
                                    return;
                                }

                                // 设置 cookies
                                if (result.allStorageData.cookies) {
                                    await setAllCookies(activeTab, result.allStorageData.cookies);
                                }

                                feedbackAll.textContent = '所有存储数据已粘贴！';
                                setTimeout(() => {
                                    feedbackAll.textContent = '';
                                }, 2000);
                            }
                        );
                    } else {
                        console.error('未找到存储的数据');
                        feedbackAll.textContent = '没有找到已复制的存储数据！';
                        setTimeout(() => {
                            feedbackAll.textContent = '';
                        }, 2000);
                    }
                });
            } catch (err) {
                console.error('粘贴过程出错:', err);
                feedbackAll.textContent = '粘贴失败: ' + err.message;
                setTimeout(() => {
                    feedbackAll.textContent = '';
                }, 2000);
            }
        });

        footerInfo.addEventListener('click', (event) => {
            if (event?.target?.id === 'infoTitle') {
                changeFooterTabStyles(event?.target?.id)
                showHideFooterTabs('moreinfoContent')
            } else if (event?.target?.id === 'supportTitle') {
                changeFooterTabStyles(event?.target?.id)
                showHideFooterTabs('supportContent')
            } else if (event?.target?.id === 'reportTitle') {
                changeFooterTabStyles(event?.target?.id)
                showHideFooterTabs('reportContent')
            }
        })

        /*
        <-----------Event Listeners End------------------------------------------------------>
        */
    } catch (err) {
        console.error('Error occured in global popup.js', err)
    }
})()
