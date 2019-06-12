# voicebricks-bot-framework
Bot framework for voice apps, developed to work with both Amazon Alexa and Actions on Google/Google Assistant.

It is recommended to use this repository through the template: https://github.com/voicebricks/voicebricks-template

This framework was originally built to address deficiencies in the [Jovo framework](https://www.jovo.tech/), which at the time included:
1. No async behaviours were possible, such as making an API request or accessing a database during a conversation. Jovo now supports this.
2. Shallow dialog designs, limited to 2 levels. Jovo has now clarified that there is no limit to the number of levels in a dialog.
3. A lack of ability to set part of a response within one intent handler, then add to it in another. Jovo may now be able to handle this by maintaining a reference to the speech builder at `this.$speech`
4. No easy way to write lots of intent variations. Jovo still has not improved in this area. VoiceBricks utterances can be defined for an intent quickly in a way that compiles into many variations. For example:

A Jovo Example intent
```json
{  
    "name":"HelloWorldIntent",
    "phrases":[  
        "hello",
        "say hello",
        "say hello world"
    ]
},
```

Same intent in VoiceBricks, where brackets represet variations and the pipe `|` separated the options. These can be nested.
```json
{  
    "name": "HelloWorldIntent",
    "samples": [
        "(say|) hello (world|)"
    ]
},
```

5. The params can't be passed to the next intent, while in VoiceBricks they can. Each handler accepts the following arguments in order: the request params, the session data object, and the user data object. This allows for quick and easy destructuring, i.e.

```
export default {
    SuggestDrink: function(params, { ignoreInventory }, { inventory = [] }) {
        //logic here
    }
}
```

6. Responses in Jovo can be randomized, but not iterated. Iterated responses ensure a user does not get the same response twice in a row. Each time the response is called, the next item from the list will be chosen.

VoiceBricks example, from the Happy Hour Alexa app:
```
  //communicate
  this.confirm(this.iterate([
    'What if you got '+this.grammar.join(recipes[0].suggestions)+'?',
    'How about '+this.grammar.join(recipes[0].suggestions)+'?',
    'You could get '+this.grammar.join(recipes[0].suggestions)+'!'
  ]));
  this.confirm(this.random([
    'Then you could make '+description+'.',
    'That opens up options like '+description+'.',
    'Then you\'ll be able to do '+description+'.'
  ]));

  if (moreAvailable) {
    this.suggestion('Yes', 'No');
    this.ask('Would you like a different ingredient suggestion?');
  } else {
    this.confirm('That\'s all I can suggest right now.')
    return this.toGlobalIntent('Help');
  }
```
