let Consts = {
	OpenDataKeys: {
		InitKey: "initKey",
		Grade: "testkey",
		LevelKey: "reachlevel",
		ScoreKey: "levelScore", // json.string
	},
	DomainAction: {
		FetchFriend: "FetchFriend",
		FetchGroup: "FetchGroup",
		FetchFriendLevel: "FetchFriendLevel", //好友关卡进度排行
		FetchFriendScore: "FetchFriendScore", //好友关卡得分排行
		HorConmpar: "HorConmpar", //横向比较 horizontal comparison
		Paging: "Paging",
		Scrolling: "Scrolling"
	},
}

const PAGE_SIZE = 5;
const ITEM_WIDTH = 478;
const ITEM_HEIGHT = 120;
let Max_Page = 0;
const RANK_PAGE_HEIGHT = ITEM_HEIGHT * PAGE_SIZE;

const dataSorter = (gameDatas, field = Consts.OpenDataKeys.LevelKey) => {
	let data = []
	for (let i = 0; i < gameDatas.length; i++) {
		if (gameDatas[i].KVDataList[0]) {
			data.push(gameDatas[i])
		}
	}
	// Max_Page = Math.ceil(data.length / PAGE_SIZE) - 1
	// console.log(Max_Page, "Max_Page")
	// return data

	let newData = data.sort((a, b) => {
		let va = a.KVDataList[0] ? a.KVDataList[0].value - 0 : 0
		let vb = b.KVDataList[0] ? b.KVDataList[0].value - 0 : 0
		return va < vb;

		// const kvDataA = a.KVDataList.find(kvData => kvData.key === field);
		// const kvDataB = b.KVDataList.find(kvData => kvData.key === field);
		// const gradeA = kvDataA ? parseInt(kvDataA.value || 0) : 0;
		// const gradeB = kvDataB ? parseInt(kvDataB.value || 0) : 0;
		// return gradeA > gradeB ? -1 : gradeA < gradeB ? 1 : 0;
	});
	Max_Page = Math.ceil(data.length / PAGE_SIZE) - 1
	console.log(Max_Page, "Max_Page")
	return newData
}

class RankListRenderer {
	constructor() {
		this.clearFlag = false
		this.offsetY = 0;
		this.maxOffsetY = 0;
		this.gameDatas = [];    //https://developers.weixin.qq.com/minigame/dev/document/open-api/data/UserGameData.html
		// this.gameLevelDatas = [];
		this.curDataType = Consts.OpenDataKeys.LevelKey
		this.curPageIndex = 0; //当前页码
		this.drawIconCount = 0;
		this.rankCanvasList = [];

		this.selfUserInfo = null //avatarUrl //https://developers.weixin.qq.com/minigame/dev/document/open-api/data/wx.getUserInfo.html

		this.init();
	}

	init() {
		this.sharedCanvas = wx.getSharedCanvas();
		this.sharedCtx = this.sharedCanvas.getContext('2d');

		this.fetchSelfInfo();
		wx.getUserCloudStorage({
			keyList:[Consts.OpenDataKeys.LevelKey],
			success: res => {
				console.log("wx.getUserCloudStorage success", res);
				if(!res.KVDataList[0]){
					wx.setUserCloudStorage({
						KVDataList:[{key:Consts.OpenDataKeys.LevelKey, value:"1"}],
						success: res => {
							console.log("wx.setUserCloudStorage success", res);
						},
						fail: res => {
							console.log("wx.setUserCloudStorage fail", res);
						},
					})
				}
			},
			fail: res => {
				console.log("wx.getUserCloudStorage fail", res);
			},
		})
	}


	listen() {
		//msg -> {action, data}
		wx.onMessage(msg => {
			//console.log("ranklist wx.onMessage", msg);
			switch (msg.action) {
				case Consts.DomainAction.HorConmpar:
					this.clearFlag = true
					this.fetchHorFriendScoreData(msg.data, msg.dataEx)
					// this.horizontalComparison()
					break;
				case Consts.DomainAction.FetchFriendLevel:
					this.clearFlag = true
					this.fetchFriendLevelData();
					break;
				case Consts.DomainAction.FetchFriendScore:
					this.clearFlag = true
					this.fetchFriendScoreData(msg.data);
					break;
				case Consts.DomainAction.FetchGroup:
					if (!msg.data) {
						return;
					}
					this.fetchGroupData(msg.data);
					break;

				case Consts.DomainAction.Paging:
					const page = msg.data;
					this.curPageIndex += page
					if (this.curPageIndex < 0) {
						this.curPageIndex = 0;
						console.log("已是第一页")
						return;
					} else if (this.curPageIndex > Max_Page) {
						this.curPageIndex = Max_Page
						console.log("已是最后一页")
						return;
					}
					this.showPagedRanks(this.curPageIndex);
					break;

				case Consts.DomainAction.Scrolling:
					this.clearFlag = false
					if (!this.gameDatas.length) {
						return;
					}
					const deltaY = msg.data;
					const newOffsetY = this.offsetY + deltaY;
					if (newOffsetY < 0) {
						//   console.log("前面没有更多了");
						return;
					}
					if (newOffsetY + PAGE_SIZE * ITEM_HEIGHT > this.maxOffsetY) {
						//   console.log("后面没有更多了");
						return;
					}
					this.offsetY = newOffsetY;
					this.showRanks(newOffsetY);
					break;

				default:
					console.log(`未知消息类型:msg.action=${msg.action}`);
					break;
			}
		});
	}

	fetchSelfInfo() {
		wx.getUserInfo({
			openIdList: ["selfOpenId"],
			success: res => {
				console.log("fetchSelfCloudData success res=>", res)
				this.selfUserInfo = res.data[0]
			}
		})
	}

	fetchGroupData(shareTicket) {
		//取出群同玩成员数据
		wx.getGroupCloudStorage({
			shareTicket,
			keyList: [
				Consts.OpenDataKeys.Grade,
			],
			success: res => {
				console.log("wx.getGroupCloudStorage success", res);
				this.gameDatas = dataSorter(res.data);
				const dataLen = this.gameDatas.length;
				this.offsetY = 0;
				this.maxOffsetY = dataLen * ITEM_HEIGHT;
				if (dataLen) {
					this.showRanks(0);
				}
			},
			fail: res => {
				console.log("wx.getGroupCloudStorage fail", res);
			},
		});
	}

	//取出所有好友数据 关卡进度
	fetchFriendLevelData() {
		wx.getFriendCloudStorage({
			keyList: [
				Consts.OpenDataKeys.LevelKey,
			],
			success: res => {
				console.log("wx.getFriendCloudStorage success", res);
				this.curDataType = Consts.OpenDataKeys.LevelKey
				this.gameDatas = dataSorter(res.data, this.curDataType);
				const dataLen = this.gameDatas.length;
				this.offsetY = 0;
				this.maxOffsetY = dataLen * ITEM_HEIGHT;
				if (dataLen) {
					this.showRanks(0);
				}
			},
			fail: res => {
				console.log("wx.getFriendCloudStorage fail", res);
			},
		});
	}

	//取出所有好友数据 关卡得分
	fetchFriendScoreData(level) {
		wx.getFriendCloudStorage({
			keyList: [
				Consts.OpenDataKeys.ScoreKey + level,
			],
			success: res => {
				console.log("wx.getFriendCloudStorage success", res);
				this.curDataType = Consts.OpenDataKeys.ScoreKey
				this.gameDatas = dataSorter(res.data, this.curDataType);
				const dataLen = this.gameDatas.length;
				this.offsetY = 0;
				this.maxOffsetY = dataLen * ITEM_HEIGHT;
				if (dataLen) {
					this.showRanks(0);
				}
			},
			fail: res => {
				console.log("wx.getFriendCloudStorage fail", res);
			},
		});
	}

	// 横向比较关卡得分
	fetchHorFriendScoreData(level, selfScore) {
		wx.getFriendCloudStorage({
			keyList: [
				Consts.OpenDataKeys.ScoreKey + level,
			],
			success: res => {
				console.log("wx.fetchHorFriendScoreData success", res);
				this.curDataType = Consts.OpenDataKeys.ScoreKey
				for (let i = 0; i < res.data.length; i++) {
					if ( res.data[i].avatarUrl === this.selfUserInfo.avatarUrl) {
						if(res.data[i].KVDataList[0].value < selfScore){
							res.data[i].KVDataList[0].value = selfScore
						}
						break;
					}
				}
				this.gameDatas = dataSorter(res.data, this.curDataType);
				this.horizontalComparison(level)
			},
			fail: res => {
				console.log("wx.fetchHorFriendScoreData fail", res);
			},
		});
	}

	// 根据滑动偏移绘制排行榜画布
	showRanks(offsetY) {
		this.curOffsetY = offsetY
		const sharedWidth = this.sharedCanvas.width;
		const sharedHeight = this.sharedCanvas.height;
		this.sharedCtx.clearRect(0, 0, sharedWidth, sharedHeight);
		if (this.clearFlag){
			this.clearFlag = false
			this.rankCanvasList = [];			
		}

		const pageY = offsetY % RANK_PAGE_HEIGHT;
		const pageIndex = Math.floor(offsetY / RANK_PAGE_HEIGHT);
		const isOverOnePage = pageY + sharedHeight > RANK_PAGE_HEIGHT;

		let rankCanvas = this.getCanvasByPageIndex(pageIndex);
		if (!isOverOnePage) {
			this.sharedCtx.drawImage(rankCanvas, 0, pageY, sharedWidth, sharedHeight, 0, 0, sharedWidth, sharedHeight);
		} else {
			//绘制当前页后半部分
			const partialHeight = RANK_PAGE_HEIGHT - pageY;
			this.sharedCtx.drawImage(rankCanvas, 0, pageY, sharedWidth, partialHeight, 0, 0, sharedWidth, partialHeight);

			//绘制下一页前半部分
			rankCanvas = this.getCanvasByPageIndex(pageIndex + 1);
			this.sharedCtx.drawImage(rankCanvas, 0, 0, sharedWidth, sharedHeight - partialHeight, 0, partialHeight, sharedWidth, sharedHeight - partialHeight);
		}
	}
	// 获取指定页码的排行榜
	getCanvasByPageIndex(pageIndex){
		let canvas = this.rankCanvasList[pageIndex];
		if (!canvas) {
			canvas = wx.createCanvas();
			canvas.width = this.sharedCanvas.width;
			canvas.height = RANK_PAGE_HEIGHT;
			this.rankCanvasList[pageIndex] = canvas;
			const ctx = canvas.getContext('2d');
			this.drawPagedRanks(ctx, pageIndex);
		}
		return canvas;
	}
	drawPagedRanks(ctx, pageIndex) {
		for (let i = 0; i < PAGE_SIZE; i++) {
			const pageOffset = pageIndex * PAGE_SIZE;
			const data = this.gameDatas[pageOffset + i];
			if (!data) continue;
			this.drawRankItemEx(ctx, pageOffset+i+1, data, ITEM_HEIGHT * i)
		}
	}

	drawAvatar(ctx, avatarUrl, x, y, w, h, cb) {
		// avatarUrl = avatarUrl.substr(0, avatarUrl.lastIndexOf('/')) + "/132";
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(x - 5, y - 5, w + 10, h + 10);

		const avatarImg = wx.createImage();
		avatarImg.src = avatarUrl;
		avatarImg.onload = () => {
			cb(avatarImg);
		};
	}

	drawRankItemEx(ctx, rank, data, itemGapY) {
		const nick = data.nickname.length <= 5 ? data.nickname : data.nickname.substr(0, 4) + "...";
		const kvData = data.KVDataList[0];
		const grade = kvData ? kvData.value : 0;

		//背景颜色
		if (rank % 2 == 1) {
			ctx.fillStyle = "#c0d0d8";
			ctx.fillRect(0, itemGapY, ITEM_WIDTH, ITEM_HEIGHT);
		}

		//名次 这里可以设置前几名的名次背景
		if (rank <= 0) {
			const rankImg = wx.createImage();
			rankImg.src = `subdomain/ranking_no${rank}.png`;
			rankImg.onload = () => {
				// if (prevOffsetY == this.offsetY) {
				ctx.drawImage(rankImg, 10, 30 + itemGapY, 78, 82);
				// }
			};
		} else {
			ctx.fillStyle = "#BDBDBD";
			ctx.textAlign = "right";
			ctx.baseLine = "middle";
			ctx.font = "40px Helvetica";
			ctx.fillText(`${rank}`, 60, 80 + itemGapY);
		}

		//头像
		const avatarX = 95;
		const avatarY = 25 + itemGapY;
		const avatarW = 80;
		const avatarH = 80;
		this.drawAvatar(ctx, data.avatarUrl, avatarX, avatarY, avatarW, avatarH, (avatarImg) => {
			// if (prevOffsetY == this.offsetY) {
			ctx.drawImage(avatarImg, avatarX, avatarY, avatarW, avatarH);
			// }
			
			if(this.drawIconCount>=this.gameDatas.length-1 || this.drawIconCount >=PAGE_SIZE-1){
				this.drawIconCount = 0;
				this.showRanks(this.curOffsetY)
			}else{
				this.drawIconCount++;
			}
		})

		//名字
		ctx.fillStyle = "#777063";
		ctx.textAlign = "left";
		ctx.baseLine = "middle";
		ctx.font = "30px Helvetica";
		ctx.fillText(nick, 190, 80 + itemGapY);

		//分数
		ctx.fillStyle = "#777063";
		ctx.textAlign = "left";
		ctx.baseLine = "middle";
		ctx.font = "30px Helvetica";
		if (this.curDataType === Consts.OpenDataKeys.LevelKey) {
			ctx.fillText(`${grade}关`, 350, 80 + itemGapY);
		} else if (this.curDataType === Consts.OpenDataKeys.ScoreKey) {
			ctx.fillText(`${grade}分`, 350, 80 + itemGapY);
		}
	}

	drawRankItemHor(ctx, rank, data, itemPos) {
		if (!data) return;
		let width = this.sharedCanvas.width
		const nick = data.nickname.length <= 6 ? data.nickname : data.nickname.substr(0, 10) + "...";
		const kvData = data.KVDataList[0];
		const grade = kvData ? kvData.value : 0;

		let avatarX
		if (itemPos === 1) {
			avatarX = width / 6
		} else if (itemPos === 2) {
			avatarX = width * 0.5
		} else if (itemPos === 3) {
			avatarX = width * 5 / 6
		}

		//名次
		if (itemPos === 2) {
			ctx.fillStyle = "#00ff00";
		} else {
			ctx.fillStyle = "#ffffff";
		}
		ctx.textAlign = "center";
		ctx.baseLine = "middle";
		ctx.font = "40px Helvetica";
		ctx.fillText(rank, avatarX, 130);

		//名字
		if (itemPos === 2) {
			ctx.fillStyle = "#00ff00";
		} else {
			ctx.fillStyle = "#ffffff";
		}
		ctx.textAlign = "center";
		ctx.baseLine = "middle";
		ctx.font = "30px Helvetica";
		ctx.fillText(nick, avatarX, 300);

		//分数
		if (itemPos === 2) {
			ctx.fillStyle = "#00ff00";
		} else {
			ctx.fillStyle = "#ffffff";
		}
		ctx.textAlign = "center";
		ctx.baseLine = "middle";
		ctx.font = "30px Helvetica";
		ctx.fillText(grade, avatarX, 350);

		//头像
		const avatarY = 160;
		const avatarW = 80;
		const avatarH = 80;
		this.drawAvatar(ctx, data.avatarUrl, avatarX - 40, avatarY, avatarW, avatarH, (avatarImg) => {
			
			// if (prevOffsetY == this.offsetY) {
			ctx.drawImage(avatarImg, avatarX - 40, avatarY, avatarW, avatarH);
			// }
		})

	}

	horizontalComparison(level) {
		let height = this.sharedCanvas.height
		let width = this.sharedCanvas.width
		let border = 3
		let padding = 15
		// setInterval(dt=>{
		this.sharedCtx.clearRect(0, 0, 1000, 1000);
		this.sharedCtx.fillStyle = "#262833";
		this.sharedCtx.fillRect(0, 0, width, height);

		this.sharedCtx.fillStyle = "#373a4a";
		this.sharedCtx.fillRect(padding, padding, border, height - padding * 2);
		this.sharedCtx.fillRect(width - padding, padding, border, height - padding * 2);
		// this.sharedCtx.fillRect(width * 0.333, padding + 60, border, height - padding * 2 - 60);
		// this.sharedCtx.fillRect(width * 0.666, padding + 60, border, height - padding * 2 - 60);

		this.sharedCtx.fillRect(padding, padding, width - padding * 2, border);
		this.sharedCtx.fillRect(padding, padding + 60, width - padding * 2, border);
		this.sharedCtx.fillRect(padding, height - padding, width - padding * 2, border);

		this.sharedCtx.fillStyle = "#181a22";
		this.sharedCtx.fillRect(width * 0.333, padding + border + 60, width * 0.333+border, (height - padding * 2 - 60-border));

		this.sharedCtx.fillStyle = "#ffffff"
		this.sharedCtx.textAlign = "left";
		this.sharedCtx.baseLine = "middle";
		this.sharedCtx.font = "30px Helvetica";
		this.sharedCtx.fillText(`第${level}关排行`, padding + 20, 60);

		let d1, d2, d3, selfRank
		for (let i = 0; i < this.gameDatas.length; i++) {
			if (this.gameDatas[i].avatarUrl === this.selfUserInfo.avatarUrl) {
				selfRank = i
				d1 = this.gameDatas[i - 1]
				d2 = this.gameDatas[i]
				d3 = this.gameDatas[i + 1]
				break;
			}
		}

		this.drawRankItemHor(this.sharedCtx, selfRank, d1, 1)
		this.drawRankItemHor(this.sharedCtx, selfRank + 1, d2, 2)
		this.drawRankItemHor(this.sharedCtx, selfRank + 2, d3, 3)

		// },100)

	}

}

const rankList = new RankListRenderer();
rankList.listen();